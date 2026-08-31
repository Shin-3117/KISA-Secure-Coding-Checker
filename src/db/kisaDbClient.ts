import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';
import * as fs from 'node:fs';

export interface KisaDocument {
  id?: number;
  category: string; // 'law', 'guideline', 'manual'
  title: string;
  pub_date: string;
  source_url: string;
  file_type: string;
}

export interface KisaSection {
  id?: number;
  doc_id?: number;
  rule_id: string; // e.g. KISA-1-01, PIPA-29, ISMS-P-2.6
  section_title: string;
  content: string;
  category: string;
  penalty_level?: string; // e.g. 과태료, 과징금, 형벌, 시정명령
  recommended_code?: string;
  vulnerable_code?: string;
}

export class KisaDbClient {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(customDbPath?: string) {
    const defaultDataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(defaultDataDir)) {
      fs.mkdirSync(defaultDataDir, { recursive: true });
    }

    this.dbPath = customDbPath || process.env.KISA_DB_PATH || path.join(defaultDataDir, 'kisa_knowledge.db');
    this.db = new DatabaseSync(this.dbPath);
    this.initTables();
  }

  private initTables(): void {
    // 1. 문서 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kisa_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        pub_date TEXT,
        source_url TEXT,
        file_type TEXT
      );
    `);

    // 2. 조항 및 세부 항목 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kisa_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id INTEGER,
        rule_id TEXT NOT NULL UNIQUE,
        section_title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        penalty_level TEXT,
        recommended_code TEXT,
        vulnerable_code TEXT,
        FOREIGN KEY (doc_id) REFERENCES kisa_documents(id)
      );
    `);

    // 3. SQLite FTS5 전문 검색 테이블
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS kisa_rules_fts USING fts5(
        rule_id,
        category,
        section_title,
        content,
        penalty_level
      );
    `);

    // 4. 백그라운드 동기화 로그 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kisa_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_date TEXT NOT NULL,
        status TEXT NOT NULL,
        items_count INTEGER DEFAULT 0,
        notes TEXT
      );
    `);
  }

  /**
   * 조항 데이터 삽입 및 FTS 인덱싱
   */
  public insertSection(section: KisaSection): void {
    const stmt = this.db.prepare(`
      INSERT INTO kisa_sections (
        doc_id, rule_id, section_title, content, category, penalty_level, recommended_code, vulnerable_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(rule_id) DO UPDATE SET
        section_title = excluded.section_title,
        content = excluded.content,
        category = excluded.category,
        penalty_level = excluded.penalty_level,
        recommended_code = excluded.recommended_code,
        vulnerable_code = excluded.vulnerable_code;
    `);

    stmt.run(
      section.doc_id || null,
      section.rule_id,
      section.section_title,
      section.content,
      section.category,
      section.penalty_level || null,
      section.recommended_code || null,
      section.vulnerable_code || null
    );

    // FTS 갱신
    this.db.prepare(`DELETE FROM kisa_rules_fts WHERE rule_id = ?;`).run(section.rule_id);
    this.db.prepare(`
      INSERT INTO kisa_rules_fts (rule_id, category, section_title, content, penalty_level)
      VALUES (?, ?, ?, ?, ?);
    `).run(
      section.rule_id,
      section.category,
      section.section_title,
      section.content,
      section.penalty_level || ''
    );
  }

  /**
   * FTS5 전문 검색 및 텍스트 매칭
   */
  public searchFts(query: string, limit: number = 10): KisaSection[] {
    const sanitized = query.replace(/['"*;]/g, ' ').trim();
    if (!sanitized) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT rule_id, category, section_title, content, penalty_level
        FROM kisa_rules_fts
        WHERE kisa_rules_fts MATCH ?
        LIMIT ?;
      `);

      const results = stmt.all(sanitized, limit) as any[];
      return results.map(row => ({
        rule_id: row.rule_id,
        category: row.category,
        section_title: row.section_title,
        content: row.content,
        penalty_level: row.penalty_level
      }));
    } catch {
      // 키워드 쿼리가 FTS 문법에 안 맞아 에러 발생 시 LIKE 검색 예외 처리
      const stmt = this.db.prepare(`
        SELECT rule_id, category, section_title, content, penalty_level, recommended_code, vulnerable_code
        FROM kisa_sections
        WHERE section_title LIKE ? OR content LIKE ? OR rule_id LIKE ?
        LIMIT ?;
      `);
      const likeQuery = `%${sanitized}%`;
      const results = stmt.all(likeQuery, likeQuery, likeQuery, limit) as any[];
      return results.map(row => ({
        rule_id: row.rule_id,
        category: row.category,
        section_title: row.section_title,
        content: row.content,
        penalty_level: row.penalty_level,
        recommended_code: row.recommended_code,
        vulnerable_code: row.vulnerable_code
      }));
    }
  }

  /**
   * ID로 세부 조항 조회
   */
  public getRuleById(ruleId: string): KisaSection | null {
    const stmt = this.db.prepare(`
      SELECT rule_id, category, section_title, content, penalty_level, recommended_code, vulnerable_code
      FROM kisa_sections
      WHERE rule_id = ?;
    `);
    const row = stmt.get(ruleId) as any;
    if (!row) return null;
    return {
      rule_id: row.rule_id,
      category: row.category,
      section_title: row.section_title,
      content: row.content,
      penalty_level: row.penalty_level,
      recommended_code: row.recommended_code,
      vulnerable_code: row.vulnerable_code
    };
  }

  /**
   * DB 상태 정보 조회
   */
  public getStats(): { total_rules: number; total_documents: number; last_sync: string; db_path: string } {
    const rulesCount = (this.db.prepare(`SELECT COUNT(*) as count FROM kisa_sections;`).get() as any)?.count || 0;
    const docsCount = (this.db.prepare(`SELECT COUNT(*) as count FROM kisa_documents;`).get() as any)?.count || 0;
    const lastLog = (this.db.prepare(`SELECT sync_date FROM kisa_sync_logs ORDER BY id DESC LIMIT 1;`).get() as any);

    return {
      total_rules: rulesCount,
      total_documents: docsCount,
      last_sync: lastLog?.sync_date || 'N/A (최초 생성 시드 DB 사용 중)',
      db_path: this.dbPath
    };
  }

  /**
   * 동기화 이력 기록
   */
  public logSync(status: string, count: number, notes?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO kisa_sync_logs (sync_date, status, items_count, notes)
      VALUES (?, ?, ?, ?);
    `);
    stmt.run(new Date().toISOString(), status, count, notes || '');
  }

  public close(): void {
    this.db.close();
  }
}
