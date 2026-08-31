import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handleCheckCompliance } from './tools/checkCompliance';
import { handlePrivacyChecker } from './tools/privacyChecker';
import { handleSearchDb, handleGetDetails } from './tools/searchDb';
import { handleSyncDb, handleCheckDbStatus } from './tools/syncDb';
import { handleAnalyzeProject } from './tools/analyzeProject';
import { buildSeedDb } from './scripts/buildSeedDb';

// 1. DB 파일 존재 여부 확인 후 없으면 시드 DB 생성
const dataDir = path.join(__dirname, '../data');
const dbPath = process.env.KISA_DB_PATH || path.join(dataDir, 'kisa_knowledge.db');

if (!fs.existsSync(dbPath)) {
  try {
    buildSeedDb();
  } catch (err) {
    console.error('❌ 시드 DB 생성 중 오류 발생:', err);
  }
}

// 2. MCP 서버 지원 도구(Tools) 정의 목록
const MCP_TOOLS = [
  {
    name: 'check_code_compliance',
    description: '소스 코드의 KISA 7대 보안 약점 및 지식 DB 법령·고시 조항 교차 진단 보조',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '검토할 소스 코드' },
        language: { type: 'string', description: '프로그래밍 언어 (예: java, python, javascript)' },
        filename: { type: 'string', description: '파일명 (선택 사항)' },
        include_laws: { type: 'boolean', description: '관련 법령 조항 포함 여부 (기본값: true)' }
      },
      required: ['code']
    }
  },
  {
    name: 'check_privacy_data_code',
    description: '개인정보/위치정보/가명정보 처리 코드 시 KISA 암호가이드라인 및 안전성 확보조치 고시 기준 검토 보조',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '검토할 소스 코드' },
        data_types: {
          type: 'array',
          items: { type: 'string' },
          description: '검토 타겟 데이터 유형 (예: ["주민등록번호", "비밀번호", "위치정보"])'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'search_kisa_knowledge_db',
    description: 'KISA DB(SQLite FTS5)에 저장된 PDF/HWP 지침 및 법령·고시 문서 전문 검색',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색 키워드 (예: "안전성 확보조치", "비밀번호 암호화")' },
        limit: { type: 'number', description: '최대 검색 결과 개수 (기본값: 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_compliance_details',
    description: 'KISA 특정 조항 ID의 PDF 원본 텍스트 및 시큐어 코딩 가이드라인 상세 조회',
    inputSchema: {
      type: 'object',
      properties: {
        rule_or_law_id: { type: 'string', description: '조항 ID (예: "KISA-1-01", "PIPA-29")' }
      },
      required: ['rule_or_law_id']
    }
  },
  {
    name: 'sync_kisa_knowledge_db',
    description: 'KISA 웹사이트를 동적으로 탐색하여 신규/개정된 법령·가이드라인 PDF를 SQLite DB에 수동 갱신',
    inputSchema: {
      type: 'object',
      properties: {
        force_full_sync: { type: 'boolean', description: '전체 동기화 여부 (기본값: false)' }
      }
    }
  },
  {
    name: 'check_db_status',
    description: '현재 SQLite DB의 동기화 날짜, 수록 조항 수 및 백그라운드 자동 갱신 상태 확인',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'analyze_project_compliance',
    description: '프로젝트 전체 대상 KISA 보안 약점 및 법적 위험 우려 사항 종합 체크리스트 마크다운 리포트 생성',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: '스캔할 프로젝트 폴더 경로' },
        report_format: { type: 'string', description: '리포트 형식 (markdown 또는 json)' }
      },
      required: ['project_path']
    }
  }
];

// 3. MCP JSON-RPC 2.0 stdio 프로토콜 서버 구현
class McpServer {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  public start(): void {
    this.rl.on('line', async (line: string) => {
      if (!line.trim()) return;
      try {
        const request = JSON.parse(line);
        await this.handleRequest(request);
      } catch (err: any) {
        this.sendError(null, -32700, 'Parse error: ' + err.message);
      }
    });
  }

  private async handleRequest(req: any): Promise<void> {
    const { id, method, params } = req;

    // 1. initialize 핸들러
    if (method === 'initialize') {
      this.sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'kisa-compliance-checker',
          version: '1.0.0'
        }
      });
      return;
    }

    // 2. notifications/initialized 핸들러
    if (method === 'notifications/initialized') {
      return; // 응답 불필요
    }

    // 3. ping 핸들러
    if (method === 'ping') {
      this.sendResponse(id, {});
      return;
    }

    // 4. tools/list 핸들러
    if (method === 'tools/list') {
      this.sendResponse(id, { tools: MCP_TOOLS });
      return;
    }

    // 5. tools/call 핸들러
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      try {
        let result: { content: Array<{ type: 'text'; text: string }> };

        switch (toolName) {
          case 'check_code_compliance':
            result = handleCheckCompliance(args);
            break;
          case 'check_privacy_data_code':
            result = handlePrivacyChecker(args);
            break;
          case 'search_kisa_knowledge_db':
            result = handleSearchDb(args);
            break;
          case 'get_compliance_details':
            result = handleGetDetails(args);
            break;
          case 'sync_kisa_knowledge_db':
            result = await handleSyncDb(args);
            break;
          case 'check_db_status':
            result = handleCheckDbStatus();
            break;
          case 'analyze_project_compliance':
            result = handleAnalyzeProject(args);
            break;
          default:
            this.sendError(id, -32601, `Unknown tool: ${toolName}`);
            return;
        }

        this.sendResponse(id, result);
      } catch (err: any) {
        this.sendError(id, -32603, `Tool execution error: ${err.message}`);
      }
      return;
    }

    // 기타 미지원 메소드
    if (id !== undefined) {
      this.sendError(id, -32601, `Method not found: ${method}`);
    }
  }

  private sendResponse(id: any, result: any): void {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  private sendError(id: any, code: number, message: string): void {
    const response = {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

// 4. 서버 생성 및 실행
const server = new McpServer();
server.start();
