import { KisaDbClient } from '../db/kisaDbClient';
import { KisaCrawler } from '../services/kisaCrawler';

export async function syncKisaDocs(forceFullSync: boolean = false): Promise<{ updated: number; status: string; details?: string }> {
  console.log(`🔄 [Live-Sync] KISA 공식 웹서버(www.kisa.or.kr) 실시간 동기화 시작 (강제 전체 동기화: ${forceFullSync})`);
  const client = new KisaDbClient();
  const crawler = new KisaCrawler();

  try {
    const statsBefore = client.getStats();
    console.log(`ℹ️ [Live-Sync] 동기화 전 DB 상태: 총 ${statsBefore.total_rules}개 조항, ${statsBefore.total_documents}개 문서 저장됨`);

    // KISA 공식 웹사이트 실시간 크롤링
    const latestDocs = await crawler.fetchLatestDocs();
    console.log(`📡 [Live-Sync] KISA 웹서버로부터 ${latestDocs.length}개 문서 수집 완료`);

    let insertedCount = 0;
    for (const doc of latestDocs) {
      client.insertDocument({
        category: doc.category,
        title: doc.title,
        pub_date: doc.pub_date,
        source_url: doc.source_url,
        file_type: doc.file_type
      });
      insertedCount++;
    }

    const now = new Date().toISOString();
    const noteMsg = `KISA 공식 서버 실시간 문서 ${insertedCount}건 수집 및 DB 동기화 완료 (${now})`;
    client.logSync('SUCCESS', insertedCount, noteMsg);

    const statsAfter = client.getStats();
    console.log(`✅ [Live-Sync] 동기화 성공! 총 ${statsAfter.total_documents}개 문서 DB 등록됨`);

    client.close();
    return {
      updated: insertedCount,
      status: 'SUCCESS',
      details: noteMsg
    };
  } catch (error: any) {
    console.error('❌ [Live-Sync] KISA 서버 동기화 중 오류 발생:', error?.message || error);
    client.logSync('FAILED', 0, `KISA 서버 연결/파싱 실패: ${error?.message || error}`);
    client.close();
    return {
      updated: 0,
      status: 'FAILED',
      details: error?.message || String(error)
    };
  }
}

if (require.main === module) {
  syncKisaDocs(true).then((res) => {
    console.log('실행 결과:', res);
  });
}
