import { KisaDbClient } from '../db/kisaDbClient';
import { RulesEngine } from '../analyzers/rulesEngine';

export interface PrivacyCheckerArgs {
  code: string;
  data_types?: string[]; // e.g. ["주민등록번호", "비밀번호", "위치정보", "가명정보"]
}

export function handlePrivacyChecker(args: PrivacyCheckerArgs): { content: Array<{ type: 'text'; text: string }> } {
  const code = args.code || '';
  const dataTypes = args.data_types && args.data_types.length > 0 ? args.data_types : ['개인정보', '주민등록번호', '비밀번호'];

  const dbClient = new KisaDbClient();
  const engine = new RulesEngine();
  const issues = engine.analyzeCode(code);

  let markdown = `## 🔐 KISA 개인정보 & 암호화 안전성 확보조치 검토 리포트\n\n`;
  markdown += `- **검토 타겟 데이터**: ${dataTypes.join(', ')}\n`;
  markdown += `- **검토 기준**: 개인정보 보호법 제24조/제29조, KISA 암호알고리즘 및 키 관리 가이드라인\n\n`;

  markdown += `### 📜 KISA 지식 DB 연동 법령 조항 및 가이드라인\n\n`;

  for (const dataType of dataTypes) {
    const dbResults = dbClient.searchFts(dataType, 2);
    if (dbResults.length > 0) {
      markdown += `#### 📌 [${dataType}] 관련 규정 및 고시 기준\n`;
      for (const res of dbResults) {
        markdown += `- **${res.section_title}** (\`${res.rule_id}\`)\n`;
        markdown += `  - **내용**: ${res.content}\n`;
        if (res.penalty_level) {
          markdown += `  - **제재 수위**: ${res.penalty_level}\n`;
        }
      }
      markdown += `\n`;
    }
  }

  // 암호화 관련 이슈 체크
  const privacyIssues = issues.filter(i => i.rule_id === 'KISA-2-03' || i.rule_id === 'KISA-2-05' || i.rule_id === 'KISA-2-06');
  if (privacyIssues.length > 0) {
    markdown += `### 🚨 코드 상의 개인정보 처리 보안 우려 사항\n\n`;
    for (const issue of privacyIssues) {
      markdown += `- **[${issue.rule_id}] ${issue.title}**: ${issue.description}\n`;
      if (issue.recommended_code) {
        markdown += `  - **추천 시큐어 코드**:\n\`\`\`java\n${issue.recommended_code}\n\`\`\`\n`;
      }
    }
  } else {
    markdown += `### ✅ 코드 상 취약 암호화 알고리즘 미탐지\n`;
    markdown += `코드 내 하드코딩된 암호키나 MD5/SHA-1 등 대표적 취약 알고리즘의 명시적 사용 패턴이 발견되지 않았습니다. 실제 런타임 환경에서 AES-256 / SHA-256 이상을 사용 중인지 재확인하세요.\n`;
  }

  dbClient.close();
  return {
    content: [
      {
        type: 'text',
        text: markdown
      }
    ]
  };
}
