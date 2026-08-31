import { RulesEngine, SecurityIssue } from '../analyzers/rulesEngine';
import { KisaDbClient } from '../db/kisaDbClient';

export interface CheckComplianceArgs {
  code: string;
  language?: string;
  filename?: string;
  include_laws?: boolean;
}

export function handleCheckCompliance(args: CheckComplianceArgs): { content: Array<{ type: 'text'; text: string }> } {
  const code = args.code || '';
  const language = args.language || 'auto';
  const filename = args.filename || 'SourceCode';
  const includeLaws = args.include_laws !== false;

  const engine = new RulesEngine();
  const issues = engine.analyzeCode(code, filename);

  const dbClient = new KisaDbClient();
  let markdown = `## 🛡️ KISA 개발보안 & 컴플라이언스 검토 리포트\n\n`;
  markdown += `- **검토 대상**: \`${filename}\` (${language})\n`;
  markdown += `- **분석 일자**: ${new Date().toLocaleString('ko-KR')}\n`;
  markdown += `- **검토 결과**: 총 **${issues.length}개**의 보안 우려 포인트 탐지됨\n\n`;
  markdown += `> ⚠️ **주의**: 본 진단 결과는 KISA 가이드라인 및 DB를 근거로 한 **개발자의 시큐어 코딩 작성 보조 지표**이며, 법적 효력을 갖는 최종 보안 검증을 대신하지 않습니다.\n\n`;

  if (issues.length === 0) {
    markdown += `### ✅ 특이사항 없음\n`;
    markdown += `제공된 코드에서 KISA 7대 보안 약점의 주요 취약 패턴이 탐지되지 않았습니다. 지속적으로 입력값 검증 및 암호화 지침을 준수해 주세요.\n`;
  } else {
    markdown += `--- \n\n`;
    markdown += `### 🚨 탐지된 KISA 보안 약점 항목\n\n`;

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      markdown += `#### ${i + 1}. [${issue.severity}] ${issue.title} (\`${issue.rule_id}\`)\n`;
      markdown += `- **카테고리**: ${issue.category}\n`;
      if (issue.line_number) {
        markdown += `- **탐지 위치**: Line ${issue.line_number}\n`;
      }
      if (issue.snippet) {
        markdown += `- **관련 코드**: \`${issue.snippet}\` \n`;
      }
      markdown += `- **설명**: ${issue.description}\n`;
      if (issue.penalty_level) {
        markdown += `- **관련 제재/기준**: ${issue.penalty_level}\n`;
      }

      // KISA DB 조항 매핑
      if (includeLaws) {
        const dbRule = dbClient.getRuleById(issue.rule_id) || dbClient.searchFts(issue.title, 1)[0];
        if (dbRule) {
          markdown += `- **KISA DB 근거 조항**: **${dbRule.section_title}**\n`;
          markdown += `  > ${dbRule.content.slice(0, 150)}...\n`;
        }
      }

      if (issue.recommended_code) {
        markdown += `\n**💡 KISA 권장 시큐어 코딩 개선 예시 (Before / After)**:\n`;
        markdown += `\`\`\`${language === 'auto' ? 'java' : language}\n${issue.recommended_code}\n\`\`\`\n`;
      }

      markdown += `\n--- \n\n`;
    }
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
