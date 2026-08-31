import { KisaDbClient } from '../db/kisaDbClient';
import { syncKisaDocs } from '../scripts/syncKisaDocs';

export interface SyncDbArgs {
  force_full_sync?: boolean;
}

export async function handleSyncDb(args: SyncDbArgs): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const forceFullSync = args.force_full_sync === true;
  const result = await syncKisaDocs(forceFullSync);

  let markdown = `## 🔄 KISA 지식 DB 동기화 완료 리포트\n\n`;
  markdown += `- **동기화 상태**: ${result.status === 'SUCCESS' ? '✅ 성공' : '❌ 실패'}\n`;
  markdown += `- **새로 추가/갱신된 항목**: ${result.updated}개\n`;
  markdown += `- **수행 시각**: ${new Date().toLocaleString('ko-KR')}\n\n`;

  const dbClient = new KisaDbClient();
  const stats = dbClient.getStats();
  markdown += `### 📊 동기화 후 DB 통계 정보\n`;
  markdown += `- **총 저장된 KISA 조항 수**: ${stats.total_rules}개\n`;
  markdown += `- **마지막 갱신 시각**: ${stats.last_sync}\n`;
  markdown += `- **DB 파일 위치**: \`${stats.db_path}\` \n`;

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

export function handleCheckDbStatus(): { content: Array<{ type: 'text'; text: string }> } {
  const dbClient = new KisaDbClient();
  const stats = dbClient.getStats();

  let markdown = `## 📊 KISA 지식 DB 상태 및 버전 리포트\n\n`;
  markdown += `- **총 수록 조항 수**: ${stats.total_rules}개\n`;
  markdown += `- **마지막 백그라운드 동기화**: ${stats.last_sync}\n`;
  markdown += `- **자동 동기화 설정 (AUTO_SYNC)**: ${process.env.AUTO_SYNC_ENABLED === 'false' ? '🔴 비활성화 (오프라인 모드)' : '🟢 활성화 (주기적 갱신)'}\n`;
  markdown += `- **DB 파일 경로**: \`${stats.db_path}\` \n\n`;

  markdown += `> KISA 공식 웹사이트(20601, 2060207, 2060307)의 최신 개정 고시 및 가이드라인 문서를 SQLite FTS5 전문 검색 엔진에 인덱싱하여 오프라인에서 0초 속도로 조회를 제공합니다.\n`;

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
