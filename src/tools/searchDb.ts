import { KisaDbClient } from '../db/kisaDbClient';

export interface SearchDbArgs {
  query: string;
  limit?: number;
}

export interface GetDetailsArgs {
  rule_or_law_id: string;
}

export function handleSearchDb(args: SearchDbArgs): { content: Array<{ type: 'text'; text: string }> } {
  const query = args.query || '';
  const limit = args.limit || 5;

  const dbClient = new KisaDbClient();
  const results = dbClient.searchFts(query, limit);

  let markdown = `## 📖 KISA 지식 DB 전문 검색 결과\n\n`;
  markdown += `- **검색어**: \`${query}\` (총 ${results.length}건 검색됨)\n\n`;

  if (results.length === 0) {
    markdown += `검색어와 일치하는 KISA 법령·고시 및 가이드라인 항목이 없습니다. 다른 키워드(예: "안전성 확보조치", "암호화", "SQL")로 검색해 보세요.\n`;
  } else {
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      markdown += `### ${i + 1}. ${item.section_title} (\`${item.rule_id}\`)\n`;
      markdown += `- **분류**: ${item.category}\n`;
      markdown += `- **내용**: ${item.content}\n`;
      if (item.penalty_level) {
        markdown += `- **관련 제재/기준**: ${item.penalty_level}\n`;
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

export function handleGetDetails(args: GetDetailsArgs): { content: Array<{ type: 'text'; text: string }> } {
  const ruleId = args.rule_or_law_id || '';
  const dbClient = new KisaDbClient();
  const rule = dbClient.getRuleById(ruleId) || dbClient.searchFts(ruleId, 1)[0];

  let markdown = `## 📜 KISA 규정 상세 정보 (\`${ruleId}\`)\n\n`;

  if (!rule) {
    markdown += `해당 조항 ID (\`${ruleId}\`)에 대한 상세 정보를 KISA DB에서 찾을 수 없습니다.\n`;
  } else {
    markdown += `### ${rule.section_title}\n`;
    markdown += `- **카테고리**: ${rule.category}\n`;
    markdown += `- **조항 ID**: \`${rule.rule_id}\` \n`;
    if (rule.penalty_level) {
      markdown += `- **관련 제재/기준**: ${rule.penalty_level}\n`;
    }
    markdown += `\n#### 📄 지침 및 조항 전문\n${rule.content}\n\n`;

    if (rule.vulnerable_code) {
      markdown += `#### ❌ 취약한 코드 예시\n\`\`\`java\n${rule.vulnerable_code}\n\`\`\`\n\n`;
    }

    if (rule.recommended_code) {
      markdown += `#### ✅ KISA 권장 시큐어 코딩 예시\n\`\`\`java\n${rule.recommended_code}\n\`\`\`\n\n`;
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
