import * as fs from 'node:fs';
import * as path from 'node:path';
import { RulesEngine, SecurityIssue } from '../analyzers/rulesEngine';

export interface AnalyzeProjectArgs {
  project_path: string;
  report_format?: 'markdown' | 'json';
}

export function handleAnalyzeProject(args: AnalyzeProjectArgs): { content: Array<{ type: 'text'; text: string }> } {
  const projectPath = args.project_path || '.';
  const reportFormat = args.report_format || 'markdown';

  if (!fs.existsSync(projectPath)) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ 지정한 프로젝트 경로가 존재하지 않습니다: \`${projectPath}\``
        }
      ]
    };
  }

  const engine = new RulesEngine();
  const allIssues: Array<{ file: string; issues: SecurityIssue[] }> = [];
  const supportedExtensions = ['.js', '.ts', '.java', '.py', '.c', '.cpp', '.cs', '.go', '.php'];

  function scanDirectory(dir: string): void {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const issues = engine.analyzeCode(content, file);
            if (issues.length > 0) {
              const relPath = path.relative(projectPath, fullPath);
              allIssues.push({ file: relPath, issues });
            }
          } catch {
            // 파일 읽기 실패 시 건너뜀
          }
        }
      }
    }
  }

  scanDirectory(projectPath);

  let totalIssues = 0;
  for (const item of allIssues) {
    totalIssues += item.issues.length;
  }

  let markdown = `## 📁 KISA 프로젝트 종합 개발보안 & 컴플라이언스 진단 리포트\n\n`;
  markdown += `- **진단 대상 경로**: \`${projectPath}\` \n`;
  markdown += `- **진단 일자**: ${new Date().toLocaleString('ko-KR')}\n`;
  markdown += `- **탐지된 총 우려 사항**: **${totalIssues}개** (총 ${allIssues.length}개 파일에서 발견)\n\n`;

  if (allIssues.length === 0) {
    markdown += `### ✅ 프로젝트 전체 특이사항 없음\n`;
    markdown += `스캔 대상 소스 코드 파일들에서 KISA 7대 보안 약점의 주요 취약 패턴이 탐지되지 않았습니다.\n`;
  } else {
    markdown += `### 📊 파일별 탐지 현황 요약\n\n`;
    for (const item of allIssues) {
      markdown += `#### 📄 \`${item.file}\` (${item.issues.length}건 탐지)\n`;
      for (const issue of item.issues) {
        markdown += `- **[Line ${issue.line_number || 'N/A'}] [${issue.severity}] ${issue.title}** (\`${issue.rule_id}\`)\n`;
        markdown += `  - ${issue.description}\n`;
      }
      markdown += `\n`;
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: markdown
      }
    ]
  };
}
