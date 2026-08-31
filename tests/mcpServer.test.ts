import * as assert from 'node:assert';
import { test } from 'node:test';
import { RulesEngine } from '../src/analyzers/rulesEngine';
import { KisaDbClient } from '../src/db/kisaDbClient';
import { handleCheckCompliance } from '../src/tools/checkCompliance';
import { handlePrivacyChecker } from '../src/tools/privacyChecker';
import { handleSearchDb, handleGetDetails } from '../src/tools/searchDb';
import { handleCheckDbStatus } from '../src/tools/syncDb';
import { buildSeedDb } from '../scripts/buildSeedDb';

test('1. KISA Seed DB 구축 및 FTS5 검색 테스트', () => {
  buildSeedDb();
  const dbClient = new KisaDbClient();
  const stats = dbClient.getStats();

  assert.ok(stats.total_rules > 0, 'Seed DB에 최소 1개 이상의 조항이 삽입되어야 합니다.');

  const searchRes = dbClient.searchFts('SQL');
  assert.ok(searchRes.length > 0, 'SQL 키워드로 FTS5 검색 시 결과가 반환되어야 합니다.');
  assert.strictEqual(searchRes[0].rule_id, 'KISA-1-01');

  dbClient.close();
});

test('2. RulesEngine 취약 코드 패턴 탐지 테스트', () => {
  const engine = new RulesEngine();
  const vulnerableCode = `
    String query = "SELECT * FROM users WHERE id = '" + userId + "'";
    String secretKey = "MySecretKey12345!";
    MessageDigest md = MessageDigest.getInstance("MD5");
  `;

  const issues = engine.analyzeCode(vulnerableCode);
  assert.ok(issues.length >= 3, '최소 3개 이상의 보안 약점이 탐지되어야 합니다.');

  const ruleIds = issues.map((i: any) => i.rule_id);
  assert.ok(ruleIds.includes('KISA-1-01'), 'SQL Injection 탐지 확인');
  assert.ok(ruleIds.includes('KISA-2-05'), 'Hardcoded Secret Key 탐지 확인');
  assert.ok(ruleIds.includes('KISA-2-06'), 'Weak Crypto Algorithm 탐지 확인');
});

test('3. check_code_compliance MCP Tool 테스트', () => {
  const sampleCode = `
    String query = "SELECT * FROM users WHERE id = '" + userId + "'";
  `;

  const res = handleCheckCompliance({ code: sampleCode, filename: 'Test.java' });
  assert.ok(res.content.length > 0);
  assert.ok(res.content[0].text.includes('SQL Injection'));
  assert.ok(res.content[0].text.includes('KISA-1-01'));
});

test('4. search_kisa_knowledge_db & get_compliance_details 테스트', () => {
  const searchRes = handleSearchDb({ query: '안전성 확보조치' });
  assert.ok(searchRes.content[0].text.includes('PIPA-29'));

  const detailsRes = handleGetDetails({ rule_or_law_id: 'PIPA-29' });
  assert.ok(detailsRes.content[0].text.includes('개인정보의 안전성 확보조치 기준'));
});

test('5. check_db_status 테스트', () => {
  const res = handleCheckDbStatus();
  assert.ok(res.content[0].text.includes('KISA 지식 DB 상태 및 버전 리포트'));
});
