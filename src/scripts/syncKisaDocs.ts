import { KisaDbClient } from '../db/kisaDbClient';
import { KisaCrawler } from '../services/kisaCrawler';

const CACHE_TTL_DAYS = 7;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function syncKisaDocs(forceFullSync: boolean = false): Promise<{ updated: number; status: string; details?: string }> {
  console.log(`🔄 [Live-Sync] KISA 공식 웹서버(www.kisa.or.kr) 동기화 확인 (강제 전체 동기화: ${forceFullSync})`);
  const client = new KisaDbClient();

  try {
    const statsBefore = client.getStats();

    // 7일 캐싱 체크 (forceFullSync가 false인 경우)
    if (!forceFullSync && statsBefore.last_sync && statsBefore.last_sync !== 'N/A (최초 생성 시드 DB 사용 중)') {
      const lastSyncTime = new Date(statsBefore.last_sync).getTime();
      const nowTime = new Date().getTime();
      const diffMs = nowTime - lastSyncTime;

      if (!isNaN(lastSyncTime) && diffMs < CACHE_TTL_MS) {
        const remainingDays = Math.ceil((CACHE_TTL_MS - diffMs) / (24 * 60 * 60 * 1000));
        const skipMsg = `⚡ 7일 캐시 유효: 최근 동기화 시각(${statsBefore.last_sync})으로부터 7일이 지나지 않아 네트워크 수집을 건너뜁니다. (남은 캐시 유효기간: 약 ${remainingDays}일). 강제 동기화가 필요할 경우 force_full_sync: true 옵션을 지정하세요.`;
        console.log(`ℹ️ [Live-Sync] ${skipMsg}`);
        client.close();
        return {
          updated: 0,
          status: 'CACHED',
          details: skipMsg
        };
      }
    }

    console.log(`ℹ️ [Live-Sync] KISA 웹서버 실시간 문서 크롤링 시작...`);
    const crawler = new KisaCrawler();

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
  syncKisaDocs(false).then((res) => {
    console.log('실행 결과:', res);
  });
}
