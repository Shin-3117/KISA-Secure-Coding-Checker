# 🛡️ KISA Secure Coding & Compliance Assistant MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Version](https://img.shields.io/badge/MCP-1.0.0-green.svg)](https://modelcontextprotocol.io)
[![KISA Official Portal](https://img.shields.io/badge/KISA-Official_Compliance_DB-red.svg)](https://www.kisa.or.kr/20601)
[![Pure Node.js](https://img.shields.io/badge/Runtime-Pure_Node.js-brightgreen.svg)](#-설치-db-구축-및-실행-방법)
[![SQLite & Auto Sync](https://img.shields.io/badge/DB-SQLite_FTS5_%2B_Auto_Sync-emerald.svg)](#-sqlite-기반-스마트-백그라운드-자동-갱신-engine)
[![Local LLM Supported](https://img.shields.io/badge/Local_LLM-Ollama_%2F_LM_Studio-blueviolet.svg)](https://ollama.ai)

**KISA Secure Coding & Compliance Assistant MCP Server**는 개발자가 소스 코드를 작성하거나 코드 리뷰를 진행할 때, 한국인터넷진흥원(KISA)의 **소프트웨어 개발보안 가이드라인 및 정보보호 관련 법령·고시 DB**를 근거로 **개발자의 보안 검토 및 시큐어 코딩 작성을 보조(Assistant)**하는 **MCP (Model Context Protocol)** 서버입니다.

> ⚡ **100% Pure Node.js & Pure PDF 설계**: 파이썬(Python) 환경 의존성이나 HWP 파싱 호환성 문제를 배포 과정에서 근본적으로 제거하기 위해, Node.js 단일 런타임과 KISA 공식 PDF 지침 문서만을 타겟으로 텍스트 추출 파이프라인을 단순화·최적화했습니다.

> ⚠️ **포지셔닝 및 사용 안내**: 본 도구는 AI가 법률적 판단이나 최종 보안 인증을 확정해 주는 도구가 아니며, KISA 지식 DB(SQLite FTS5 + Vector)에서 관련 지침과 조항을 찾아 **개발자가 스스로 정밀한 보안 검토를 수행할 수 있도록 조력하는 보조 툴(Developer Copilot)**입니다.

---

## 📋 목차

- [주요 보조 기능](#-주요-보조-기능)
- [⚖️ 주요 면책 조항 (Disclaimer)](#️-주요-면책-조항-disclaimer)
- [🏛️ KISA 검증 참고 대상 및 공식 출처](#️-kisa-검증-참고-대상-및-공식-출처)
- [🔄 SQLite 기반 스마트 백그라운드 자동 갱신 Engine](#-sqlite-기반-스마트-백그라운드-자동-갱신-engine)
- [⚙️ MCP 클라이언트 설정 방법 (stdio / Remote SSE / npx)](#️-mcp-클라이언트-설정-방법-stdio--remote-sse--npx)
- [🛠️ 제공하는 MCP 도구 (Tools)](#-제공하는-mcp-도구-tools)
- [🚀 설치, DB 구축 및 실행 방법](#-설치-db-구축-및-실행-방법)
- [💡 사용 예시](#-사용-예시)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [📄 라이선스 및 저작권 안내](#-라이선스-및-저작권-안내)

---

## ✨ 주요 보조 기능

- 📄 **KISA 공식 PDF 지침 전문 DB화**: KISA 웹사이트의 PDF 배포 문서를 `pdf-parse` 파이프라인으로 파싱하여 SQLite DB 구축
- 🔍 **KISA 가이드라인 근거 코드 검토 보조**: KISA 7대 소프트웨어 개발보안 가이드(47개 보안 약점) 패턴 기반의 검토 포인트 제안
- 📖 **관련 법령/고시 조항 교차 참조 지원**: 개인정보 보호법(안전성 확보조치 고시), 정보통신망법(ISMS-P), 위치정보법 조항 원문 참고 제공
- 🛠️ **시큐어 코딩 리팩토링 가이드 지원**: 탐지된 우려 사항에 대해 KISA 추천 시큐어 코딩 패턴 기반 개선 코드(Before / After) 제시
- 🔄 **백그라운드 DB 갱신 수용**: KISA 지식플랫폼의 최신 개정 PDF 문서를 확인하여 지식 DB를 최신 상태로 증분 갱신
- 🔒 **100% 로컬 / 온프레미스 분석 지원**: Ollama, LM Studio 등 로컬 LLM과 연동하여 보안 민감 코드를 외부 전송 없이 자체 검토 보조

---

## ⚖️ 주요 면책 조항 (Disclaimer)

1. **최종 판단의 주체**: 본 MCP 서버가 제공하는 분석 리포트, 참고 조항, 개선 코드 가이드는 **개발자의 의사결정을 돕기 위한 참고용 정보**입니다.
2. **법적 효력 미비**: AI의 분석 결과는 법적 효력을 갖지 않으며, ISMS-P 인증, 개인정보 영향평가(PIA), 감리 등 공식적인 보안 심사 및 법률 진단을 대신할 수 없습니다.
3. **책임 범위**: 소스 코드의 실제 보안성 확보 및 법적 컴플라이언스 준수의 최종 책임은 개발자 및 해당 조직의 정보보호책임자(CISO/CPO)에게 있습니다.

---

## 🏛️ KISA 검증 참고 대상 및 공식 출처

본 서버는 KISA 지식플랫폼 공식 카테고리에 배포된 모든 **법령·고시, 가이드라인, 안내서 PDF 문서**를 파싱하여 구축된 DB를 기반으로 작동합니다.

| 분류                | KISA 공식 링크                                              | 주요 참고 및 검증 범위                                                                                                                                                                                                                                                             |
| :------------------ | :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **법령·고시**       | [KISA 법령·고시 (20601)](https://www.kisa.or.kr/20601)      | **14개 법률 영역 참고 조항 매핑 (PDF 전문)**<br>• 개인정보 보호법(안전성 확보조치 기준 고시, 영향평가 고시)<br>• 정보통신망법(ISMS-P 인증 고시, 정보보호조치 지침)<br>• 위치정보법(관리적·기술적 보호조치 기준 고시)<br>• 전자서명법, 전자문서법, 정보통신기반보호법, CSAP 고시 등 |
| **가이드라인**      | [KISA 가이드라인 (2060207)](https://www.kisa.or.kr/2060207) | **KISA 기술 보안 지침 참조 (PDF 전문)**<br>• 소프트웨어 개발보안 가이드 (7대 보안 약점, 47개 항목)<br>• SW 공급망 보안 가이드라인 (SBOM)<br>• 가명정보 처리 가이드라인 / AI 보안 가이드라인                                                                                        |
| **안내서 / 해설서** | [KISA 안내서 (2060307)](https://www.kisa.or.kr/2060307)     | **KISA 실무 해설서 참조 (PDF 전문)**<br>• KISA 암호알고리즘 및 키 관리 가이드라인<br>• 개인정보 안전성 확보조치 기준 해설서                                                                                                                                                        |

---

## 🔄 SQLite 기반 스마트 백그라운드 자동 갱신 Engine

이 프로젝트는 **단일 파일 기반 SQLite DB의 가벼움**과 **최신 KISA PDF 지침 문서의 주기적 갱신**을 돕기 위해 **Pure TypeScript 기반 백그라운드 자동 갱신 모듈**을 탑재하고 있습니다.

```
[ KISA 지식플랫폼 (kisa.or.kr) ]
       │
       │ (1) 백그라운드 개정 PDF 문서 감지 (기본 7일 주기)
       ▼
[ MCP 서버 (Pure Node.js) ]
       │
       │ (2) 개정된 PDF 문서만 npm pdf-parse 파이프라인으로 수집/파싱
       ▼
[ SQLite DB (data/kisa_knowledge.db) ]
       │
       │ (3) 근거 문맥(Context) 제공 준비 완료
       ▼
[ 개발자 + AI 에이전트 ]
       └── 개발자가 코드 작성 시 최신 지침을 근거로 보안 검토 보조 받음!
```

---

## ⚙️ MCP 클라이언트 설정 방법 (stdio / Remote SSE / npx)

---

### 1. 로컬 프로세스 방식 (`stdio` - 권장 ⭐)

> 가장 보편적이고 안전한 로컬 오프라인 방식입니다. AI 클라이언트(Claude Desktop, Cursor 등)가 본인의 PC에서 `node` 프로세스를 직접 실행하여 로컬 SQLite DB를 참조합니다.

```json
{
  "mcpServers": {
    "kisa-compliance-checker": {
      "command": "node",
      "args": ["<실제_설치한_프로젝트_절대_경로>/dist/index.js"],
      "env": {
        "LLM_PROVIDER": "ollama",
        "OLLAMA_HOST": "http://localhost:11434",
        "OLLAMA_MODEL": "qwen2.5-coder:14b",
        "AUTO_SYNC_ENABLED": "true"
      }
    }
  }
}
```

---

### 2. npm 패키지 방식 (`npx` 실행)

```json
{
  "mcpServers": {
    "kisa-compliance-checker": {
      "command": "npx",
      "args": ["-y", "@your-org/kisa-secure-coding-checker"],
      "env": {
        "LLM_PROVIDER": "none"
      }
    }
  }
}
```

---

### 3. 원격 웹 서버 방식 (`HTTPS / Remote SSE`)

```json
{
  "mcpServers": {
    "kisa-compliance-checker": {
      "url": "https://mcp.your-company.com/kisa/sse"
    }
  }
}
```

---

## 🛠️ 제공하는 MCP 도구 (Tools)

| 도구명 (Tool Name)           | 역할 및 기능                                                                           | 주요 매개변수                                |
| :--------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------- |
| `check_code_compliance`      | 소스 코드 작성 시 KISA 보안 약점 패턴 및 관련 조항 문맥을 찾아 **보안 검토 보조**      | `code`: 소스 코드<br>`language`: 언어        |
| `check_privacy_data_code`    | 개인정보/가명정보 처리 코드 시 KISA 암호가이드라인 및 안전조치 기준 **참고 정보 제시** | `code`: 소스 코드<br>`data_types`: 검토 대상 |
| `search_kisa_knowledge_db`   | KISA DB(SQLite FTS5)에 저장된 PDF 지침 문서 **전문 검색 조력**                         | `query`: 검색어 (예: "안전성 확보조치")      |
| `sync_kisa_knowledge_db`     | KISA 웹사이트를 탐색하여 신규/개정 가이드라인 PDF를 SQLite DB에 **수동 갱신 요청**     | `force_full_sync`: (기본값: false)           |
| `check_db_status`            | 현재 지식 DB의 동기화 날짜 및 수록된 지침 수 확인                                      | 없음                                         |
| `get_compliance_details`     | KISA 특정 조항 원문 및 시큐어 코딩 지침 가이드 **상세 조회**                           | `rule_or_law_id`: 조항 ID                    |
| `analyze_project_compliance` | 프로젝트 전체 대상 보안 우려 사항 및 체크리스트 **보조 리포트 생성**                   | `project_path`: 프로젝트 경로                |

---

## 🚀 설치, DB 구축 및 실행 방법

### 1. 사전 요구 사항

- **Node.js**: v18.0.0 이상

### 2. 저장소 클론 및 패키지 설치

```bash
git clone https://github.com/your-org/KISA-Secure-Coding-Checker.git
cd KISA-Secure-Coding-Checker
npm install
```

### 3. KISA 문서 수집 및 SQLite DB 초기 구축

```bash
# KISA 지침서 PDF 파싱 및 SQLite DB 구축 (data/kisa_knowledge.db)
npm run db:ingest
```

### 4. 프로젝트 빌드

```bash
npm run build
```

---

## 💡 사용 예시

### 프롬프트 예시 1: 개발자의 시큐어 코딩 검토 보조

> 💬 "내가 작성한 `UserService.java` 코드에서 KISA 시큐어 코딩 가이드라인 기준으로 보완이 필요한 부분이 있는지 `check_code_compliance`로 참고 조항과 함께 검토해줘."

### 프롬프트 예시 2: 개인정보 암호화 관련 지침 교차 확인

> 💬 "주민등록번호 암호화 로직 작성 중인데, KISA 암호 가이드라인상 권장 알고리즘과 안전성 확보조치 기준 관련 조항을 `get_compliance_details`로 찾아서 보여줘."

---

## 📁 프로젝트 구조

```
KISA-Secure-Coding-Checker/
├── data/
│   └── kisa_knowledge.db           # KISA 지침 전문 저장 SQLite FTS5 DB
├── scripts/
│   ├── parsePdf.ts                 # Pure TypeScript PDF 문서 텍스트 추출 스크립트
│   └── syncKisaDocs.ts             # 증분 동기화(Incremental Sync) 스크립트
├── src/
│   ├── index.ts                     # MCP 서버 진입점
│   ├── db/                          # SQLite DB 조회, FTS5 및 Vector Search 엔진
│   ├── tools/                       # 개발자 보안 검토 보조 MCP Tools
│   ├── llm/                         # 로컬 LLM 어댑터 (Ollama / OpenAI 호환)
│   └── analyzers/                   # 정적 분석 및 AST 파서 엔진
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📄 라이선스 및 저작권 안내

본 프로젝트는 [MIT License](LICENSE)에 따라 라이선스가 부여됩니다.

- KISA 법령·고시, 가이드라인 및 안내서 원본 문서의 저작권은 [한국인터넷진흥원(KISA)](https://www.kisa.or.kr)에 있습니다.
