import { KisaDocument } from '../db/kisaDbClient';

export interface FetchedKisaDoc {
  category: string;
  title: string;
  pub_date: string;
  source_url: string;
  file_type: string;
}

export class KisaCrawler {
  private readonly baseUrl = 'https://www.kisa.or.kr';

  /**
   * KISA 공식 웹사이트(가이드라인, 법령, 안내서) 실시간 수집
   */
  public async fetchLatestDocs(): Promise<FetchedKisaDoc[]> {
    const fetchedDocs: FetchedKisaDoc[] = [];

    // 1. 가이드라인 게시판 (2060207)
    try {
      const guidelineDocs = await this.fetchBoardPage('/2060207', '가이드라인');
      fetchedDocs.push(...guidelineDocs);
    } catch (err: any) {
      console.warn(`⚠️ KISA 가이드라인 수집 중 경고: ${err?.message || err}`);
    }

    // 2. 안내서 게시판 (2060307)
    try {
      const manualDocs = await this.fetchBoardPage('/2060307', '안내서');
      fetchedDocs.push(...manualDocs);
    } catch (err: any) {
      console.warn(`⚠️ KISA 안내서 수집 중 경고: ${err?.message || err}`);
    }

    // 3. 법령·고시 페이지 (20601)
    try {
      const lawDocs = await this.fetchLawPage('/20601', '법령');
      fetchedDocs.push(...lawDocs);
    } catch (err: any) {
      console.warn(`⚠️ KISA 법령·고시 수집 중 경고: ${err?.message || err}`);
    }

    return fetchedDocs;
  }

  /**
   * KISA 일반 게시판(가이드라인, 안내서 등) 파싱
   */
  private async fetchBoardPage(path: string, category: string): Promise<FetchedKisaDoc[]> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} (${url})`);
    }

    const html = await response.text();
    const results: FetchedKisaDoc[] = [];

    // <tr>...<td class="sbj txtL"><a href="...">제목</a></td><td class="date">YYYY-MM-DD</td>...</tr> 패턴 매칭
    const rowRegex = /<tr>[\s\S]*?<td class="sbj txtL">[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<td class="date">([^<]+)<\/td>[\s\S]*?<\/tr>/g;

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const linkPath = match[1].trim();
      const title = match[2].trim();
      const pubDate = match[3].trim();

      const fullUrl = linkPath.startsWith('http') ? linkPath : `${this.baseUrl}${linkPath}`;
      let fileType = 'HTML';
      if (html.includes('pdf.png')) fileType = 'PDF';
      else if (html.includes('hwp.png')) fileType = 'HWP';

      results.push({
        category,
        title,
        pub_date: pubDate,
        source_url: fullUrl,
        file_type: fileType
      });
    }

    return results;
  }

  /**
   * KISA 법령·고시 링크 목록 파싱
   */
  private async fetchLawPage(path: string, category: string): Promise<FetchedKisaDoc[]> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} (${url})`);
    }

    const html = await response.text();
    const results: FetchedKisaDoc[] = [];
    const today = new Date().toISOString().split('T')[0];

    // <a href="..." ...>법령/고시명</a> 매칭
    const linkRegex = /<a href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const linkUrl = match[1].trim();
      const title = match[2].trim();

      if (title.length > 2 && (title.includes('법') || title.includes('고시') || title.includes('기준') || title.includes('지침') || title.includes('규정'))) {
        results.push({
          category,
          title,
          pub_date: today,
          source_url: linkUrl,
          file_type: 'HTML/LAW'
        });
      }
    }

    return results;
  }
}
