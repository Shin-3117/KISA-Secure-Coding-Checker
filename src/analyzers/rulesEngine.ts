export interface SecurityIssue {
  rule_id: string;
  category: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  line_number?: number;
  snippet?: string;
  description: string;
  penalty_level?: string;
  recommended_code?: string;
}

export interface RulePattern {
  rule_id: string;
  category: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  regex: RegExp;
  description: string;
  penalty_level?: string;
  recommended_code?: string;
}

export const KISA_RULE_PATTERNS: RulePattern[] = [
  // 1. SQL Injection
  {
    rule_id: 'KISA-1-01',
    category: '입력 데이터 검증 및 표현',
    title: 'SQL Injection (SQL 인젝션)',
    severity: 'HIGH',
    regex: /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*(\+|concat|\$\{)|(executeQuery|executeUpdate)\s*\(/i,
    description: '문자열 결합 또는 템플릿 리터럴을 통해 SQL 쿼리를 동적 생성하고 있습니다. Prepared Statement 매개변수화 쿼리로 변경해야 합니다.',
    penalty_level: '개인정보 유출 시 과징금 / 형벌',
    recommended_code: '// PreparedStatement / Parameterized Query 사용\nString sql = "SELECT * FROM users WHERE id = ?";\nPreparedStatement pstmt = conn.prepareStatement(sql);\npstmt.setString(1, userId);'
  },
  // 2. XSS
  {
    rule_id: 'KISA-1-02',
    category: '입력 데이터 검증 및 표현',
    title: 'Cross-Site Scripting (XSS / 크로스사이트 스크립팅)',
    severity: 'HIGH',
    regex: /innerHTML\s*=|\$\(.*\)\.html\(|document\.write\(|res\.send\(.*<script>/i,
    description: '외부 입력값이 이스케이프 검증 없이 DOM 또는 HTML 응답에 직접 렌더링되고 있습니다. HTML Escape 필터링을 적용하세요.',
    penalty_level: '시정명령 / ISMS-P 결함',
    recommended_code: '// textContent 사용 또는 HTML 치환\nelement.textContent = userInput;'
  },
  // 3. Path Traversal
  {
    rule_id: 'KISA-1-03',
    category: '입력 데이터 검증 및 표현',
    title: 'Path Traversal (경로 탐색 취약점)',
    severity: 'HIGH',
    regex: /new\s+File\s*\([^,\n]*req(uest)?\.|readFileSync\s*\([^,\n]*req(uest)?\.|open\s*\([^,\n]*req(uest)?\./i,
    description: '사용자 입력값을 검증 없이 파일 경로 조작에 사용하고 있습니다. "../" 등 상위 경로 이동 문자열 필터링이 필요합니다.',
    penalty_level: '시정명령',
    recommended_code: 'if (filename.contains("..") || filename.contains("/")) {\n    throw new SecurityException("잘못된 파일 경로입니다.");\n}'
  },
  // 4. Command Injection
  {
    rule_id: 'KISA-1-04',
    category: '입력 데이터 검증 및 표현',
    title: 'Command Injection (운영체제 명령어 삽입)',
    severity: 'HIGH',
    regex: /Runtime\.getRuntime\(\)\.exec\(.*(\+|^\$)|child_process\.exec\(|os\.system\(|subprocess\.Popen\(.*shell\s*=\s*True/i,
    description: '운영체제 명령어 실행 API에 입력값이 직접 결합되고 있습니다. execFile 또는 매개변수 배열 전달 방식을 사용하세요.',
    penalty_level: '형벌 / 과태료',
    recommended_code: '// child_process.execFile 사용\nexecFile("ping", ["-c", "1", host]);'
  },
  // 5. Plaintext Sensitive Data
  {
    rule_id: 'KISA-2-03',
    category: '보안 기능',
    title: '중요정보 평문 저장 (Plaintext Storage of Sensitive Data)',
    severity: 'HIGH',
    regex: /(password|passwd|ssn|social_security|rrn|card_num|creditcard)\s*=\s*['"][^'"]+['"]/i,
    description: '비밀번호 또는 주민등록번호 등 고유식별정보가 평문으로 처리되거나 하드코딩되고 있습니다. KISA 승인 일방향/양방향 암호화를 적용하세요.',
    penalty_level: '개인정보보호법 제29조 위반 (매출액 3% 이하 과징금)',
    recommended_code: '// BCrypt / PBKDF2 암호화 적용\nString hashedPassword = passwordEncoder.encode(rawPassword);'
  },
  // 6. Hardcoded Secret Key
  {
    rule_id: 'KISA-2-05',
    category: '보안 기능',
    title: '하드코딩된 암호화 키 및 비밀번호',
    severity: 'HIGH',
    regex: /(secret_key|secretKey|jwt_secret|api_key|private_key|db_password)\s*=\s*['"][a-zA-Z0-9_\-!@#$%^&*]{6,}['"]/i,
    description: '암호화 키나 비밀번호가 소스 코드에 평문 상수로 하드코딩되어 있습니다. 환경 변수나 Secret Manager로 분리하세요.',
    penalty_level: '시정명령 / ISMS-P 결함',
    recommended_code: 'const secretKey = process.env.APP_SECRET_KEY;'
  },
  // 7. Weak Crypto Algorithm
  {
    rule_id: 'KISA-2-06',
    category: '보안 기능',
    title: '취약한 암호화 알고리즘 사용 (MD5 / SHA-1 / DES)',
    severity: 'MEDIUM',
    regex: /MessageDigest\.getInstance\s*\(\s*["'](MD5|SHA-1|SHA1|DES|RC4)["']\)|crypto\.createHash\s*\(\s*["'](md5|sha1)["']\)/i,
    description: 'MD5 및 SHA-1 알고리즘은 충돌 공격에 취약하므로 KISA 암호 가이드라인에 따라 SHA-256 이상을 사용해야 합니다.',
    penalty_level: '과태료 / ISMS-P 결함',
    recommended_code: 'MessageDigest md = MessageDigest.getInstance("SHA-256");'
  },
  // 8. Weak Random Generator
  {
    rule_id: 'KISA-2-07',
    category: '보안 기능',
    title: '취약한 난수 생성기 사용 (Weak PRNG)',
    severity: 'MEDIUM',
    regex: /new\s+Random\(\)|Math\.random\(\)/i,
    description: '보안 관련 로직(인증 토큰, 비밀번호 생성 등)에 예측 가능한 표준 Random()을 사용하면 보안 위험이 있습니다. SecureRandom / crypto.getRandomValues를 사용하세요.',
    penalty_level: '시정명령',
    recommended_code: 'SecureRandom random = new SecureRandom();'
  },
  // 9. Error Stack Trace Exposure
  {
    rule_id: 'KISA-4-01',
    category: '에러 처리',
    title: '오류 메시지를 통한 정보 노출 (Information Exposure)',
    severity: 'LOW',
    regex: /e\.printStackTrace\(\)|console\.error\(e\)|res\.send\(err\.stack\)/i,
    description: '예외 발생 시 디버그 스택 트레이스나 상세 오류 메시지가 외부 응답에 직접 노출될 수 있습니다.',
    penalty_level: '시정명령',
    recommended_code: 'logger.error("시스템 오류 발생", e);\nres.status(500).send("일시적인 시스템 오류입니다.");'
  },
  // 10. Leftover Debug Code
  {
    rule_id: 'KISA-6-01',
    category: '캡슐화',
    title: '제거되지 않은 디버그 코드 (Leftover Debug Code)',
    severity: 'LOW',
    regex: /System\.out\.println\(|console\.log\(|print\s*\(.*debug/i,
    description: '운영 환경에 남겨진 디버그 로그 출력 코드는 민감한 데이터 유출 및 성능 저하를 유발할 수 있습니다.',
    penalty_level: '품질 지침',
    recommended_code: 'logger.debug("처리 결과: {}", result);'
  }
];

export class RulesEngine {
  /**
   * 소스 코드 텍스트를 검사하여 KISA 보안 약점 탐지
   */
  public analyzeCode(code: string, filename?: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineContent = lines[i];

      for (const pattern of KISA_RULE_PATTERNS) {
        if (pattern.regex.test(lineContent)) {
          issues.push({
            rule_id: pattern.rule_id,
            category: pattern.category,
            title: pattern.title,
            severity: pattern.severity,
            line_number: i + 1,
            snippet: lineContent.trim(),
            description: pattern.description,
            penalty_level: pattern.penalty_level,
            recommended_code: pattern.recommended_code
          });
        }
      }
    }

    return issues;
  }
}
