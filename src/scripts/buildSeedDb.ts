import { KisaDbClient, KisaSection } from '../db/kisaDbClient';

const SEED_SECTIONS: KisaSection[] = [
  // 1. 입력 데이터 검증 및 표현 (Input Validation)
  {
    rule_id: 'KISA-1-01',
    category: '입력 데이터 검증 및 표현',
    section_title: 'SQL Injection (SQL 인젝션)',
    content: '데이터베이스 쿼리 생성 시 외부 입력값을 적절한 검증이나 매개변수화(Parameterized Query) 없이 문자열 결합 형태로 사용하는 경우 발생합니다. 쿼리 구조가 무단 수정되어 데이터 유출 및 손상이 발생할 수 있습니다.',
    penalty_level: '형벌 / 과징금 (개인정보 유출 시)',
    vulnerable_code: `// 취약한 예시 (Java)\nString query = "SELECT * FROM users WHERE id = '" + userId + "' AND pass = '" + userPass + "'";\nStatement stmt = conn.createStatement();\nResultSet rs = stmt.executeQuery(query);`,
    recommended_code: `// 안전한 예시 (Java - Prepared Statement)\nString query = "SELECT * FROM users WHERE id = ? AND pass = ?";\nPreparedStatement pstmt = conn.prepareStatement(query);\npstmt.setString(1, userId);\npstmt.setString(2, userPass);\nResultSet rs = pstmt.executeQuery();`
  },
  {
    rule_id: 'KISA-1-02',
    category: '입력 데이터 검증 및 표현',
    section_title: 'Cross-Site Scripting (XSS / 크로스사이트 스크립팅)',
    content: '웹 애플리케이션에서 사용자 입력값에 포함된 악성 HTML/JavaScript 코드를 적절한 이스케이프(Escape) 또는 필터링 없이 응답 브라우저로 출력할 때 발생합니다. 세션 쿠키 탈취, 악성코드 유포 등의 위험이 있습니다.',
    penalty_level: '시정명령 / ISMS-P 결함',
    vulnerable_code: `// 취약한 예시 (JS/Node)\nres.send("<div>Welcome, " + req.query.name + "</div>");`,
    recommended_code: `// 안전한 예시 (JS/Node - HTML Escape)\nconst sanitizeHtml = require('sanitize-html');\nconst safeName = sanitizeHtml(req.query.name);\nres.send("<div>Welcome, " + safeName + "</div>");`
  },
  {
    rule_id: 'KISA-1-03',
    category: '입력 데이터 검증 및 표현',
    section_title: 'Path Traversal (경로 탐색 취약점)',
    content: '외부 입력값을 파일 경로(File Path) 상에 직접 사용할 때, "../" 및 "..\\" 상위 디렉토리 이동 문자열에 대한 검증이 없어 시스템의 의도하지 않은 중요 파일(/etc/passwd, 설정 파일 등)에 접근하는 취약점입니다.',
    penalty_level: '시정명령 / 정보통신망법 위반',
    vulnerable_code: `// 취약한 예시 (Java)\nFile file = new File("/www/uploads/" + request.getParameter("filename"));\nFileInputStream fis = new FileInputStream(file);`,
    recommended_code: `// 안전한 예시 (Java)\nString filename = request.getParameter("filename");\nif (filename.contains("..") || filename.contains("/") || filename.contains("\\\\")) {\n    throw new SecurityException("잘못된 파일 경로입니다.");\n}\nFile file = new File("/www/uploads/" + filename);`
  },
  {
    rule_id: 'KISA-1-04',
    category: '입력 데이터 검증 및 표현',
    section_title: 'Command Injection (운영체제 명령어 삽입)',
    content: '운영체제 명령어를 실행하는 API(Runtime.getRuntime().exec, child_process.exec 등)의 인자값에 외부 검증되지 않은 입력값을 결합할 때 발생합니다.',
    penalty_level: '형벌 / 과태료',
    vulnerable_code: `// 취약한 예시 (JS/Node)\nconst { exec } = require('child_process');\nexec("ping -c 1 " + req.query.host);`,
    recommended_code: `// 안전한 예시 (JS/Node - execFile 사용)\nconst { execFile } = require('child_process');\nexecFile("ping", ["-c", "1", req.query.host]);`
  },
  {
    rule_id: 'KISA-1-06',
    category: '입력 데이터 검증 및 표현',
    section_title: '위험한 파일 업로드 (Unrestricted File Upload)',
    content: '업로드 파일의 확장자, 파일 타입(MIME type), 및 경로를 검증하지 않아 웹쉘(WebShell)이나 실행 파일(.jsp, .php, .exe)이 서버에 업로드되고 실행될 수 있는 보안 약점입니다.',
    penalty_level: '정보통신망법 침해사고 원인',
    vulnerable_code: `// 취약한 예시 (Java)\nString fileName = uploadFile.getOriginalFilename();\nuploadFile.transferTo(new File(uploadDir, fileName));`,
    recommended_code: `// 안전한 예시 (Java - 화이트리스트 확장자 검증)\nString fileName = uploadFile.getOriginalFilename();\nString ext = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();\nList<String> allowedExts = Arrays.asList("png", "jpg", "pdf", "docx");\nif (!allowedExts.contains(ext)) {\n    throw new SecurityException("허용되지 않은 파일 형식입니다.");\n}\nString safeFileName = UUID.randomUUID().toString() + "." + ext;\nuploadFile.transferTo(new File(uploadDir, safeFileName));`
  },

  // 2. 보안 기능 (Security Features)
  {
    rule_id: 'KISA-2-03',
    category: '보안 기능',
    section_title: '중요정보 평문 저장 (Plaintext Storage of Sensitive Data)',
    content: '주민등록번호, 비밀번호, 계좌번호, 카드번호, 건강 정보 등 법률상 주요 정보보호 대상을 DB나 파일에 평문으로 저장할 때 발생합니다. 개인정보보호법 제29조 및 개인정보의 안전성 확보조치 기준에 직접 저촉됩니다.',
    penalty_level: '과징금 (전체 매출액의 최대 3%) / 과태료',
    vulnerable_code: `// 취약한 예시 (Java)\nuser.setPassword(rawPassword);\nuserRepository.save(user);`,
    recommended_code: `// 안전한 예시 (Java - KISA 승인 일방향 암호화 PBKDF2/BCrypt)\nString hashedPassword = passwordEncoder.encode(rawPassword);\nuser.setPassword(hashedPassword);\nuserRepository.save(user);`
  },
  {
    rule_id: 'KISA-2-05',
    category: '보안 기능',
    section_title: '하드코딩된 암호화 키 및 비밀번호 (Hardcoded Secret Key)',
    content: '소스 코드 내부에 암호화 키, DB 비밀번호, API 토큰을 상수로 직접 기재하는 경우 발생합니다. 소스 코드 유출 시 전체 암호화 체계가 무력화됩니다.',
    penalty_level: '시정명령 / ISMS-P 결함',
    vulnerable_code: `// 취약한 예시 (Java)\nprivate static final String SECRET_KEY = "MySecretKey12345!";`,
    recommended_code: `// 안전한 예시 (Java - 외부 환경변수 또는 Key Vault 로드)\nString secretKey = System.getenv("APP_SECRET_KEY");`
  },
  {
    rule_id: 'KISA-2-06',
    category: '보안 기능',
    section_title: '취약한 암호화 알고리즘 사용 (Use of Weak Crypto)',
    content: 'MD5, SHA-1, DES, RC4 등 KISA 암호알고리즘 및 키 관리 가이드라인에서 취약(Deprecated)하다고 규정한 암호화 알고리즘을 사용하는 보안 약점입니다.',
    penalty_level: '과태료 / ISMS-P 결함',
    vulnerable_code: `// 취약한 예시 (Java)\nMessageDigest md = MessageDigest.getInstance("MD5");`,
    recommended_code: `// 안전한 예시 (Java - SHA-256 / SHA-512 또는 AES-256)\nMessageDigest md = MessageDigest.getInstance("SHA-256");`
  },
  {
    rule_id: 'KISA-2-07',
    category: '보안 기능',
    section_title: '취약한 난수 생성기 사용 (Use of Weak PRNG)',
    content: '보안 관련 로직(세션 키 생성, 비밀번호 초기화 토큰, 암호화 난수 등)에 예측 가능한 표준 Random() 함수를 사용할 때 발생합니다.',
    penalty_level: '시정명령',
    vulnerable_code: `// 취약한 예시 (Java)\nRandom random = new Random();\nint token = random.nextInt();`,
    recommended_code: `// 안전한 예시 (Java - SecureRandom 사용)\nSecureRandom random = new SecureRandom();\nbyte[] bytes = new byte[16];\nrandom.nextBytes(bytes);`
  },

  // 3. 에러 처리 및 코드 오류 (Error Handling & Code Errors)
  {
    rule_id: 'KISA-4-01',
    category: '에러 처리',
    section_title: '오류 메시지를 통한 정보 노출 (Information Exposure)',
    content: '예외 발생 시 e.printStackTrace()나 스택 트레이스(Stack Trace) 전체를 사용자 브라우저 응답으로 직접 출력하여 시스템 내부 경로, DB 쿼리, 프레임워크 버전이 노출되는 취약점입니다.',
    penalty_level: '시정명령',
    vulnerable_code: `// 취약한 예시 (Java)\ncatch (SQLException e) {\n    e.printStackTrace();\n    response.getWriter().println(e.getMessage());\n}`,
    recommended_code: `// 안전한 예시 (Java)\ncatch (SQLException e) {\n    logger.error("DB 처리 중 오류 발생", e);\n    response.getWriter().println("시스템 내부 오류가 발생했습니다. 관리자에게 문의하세요.");\n}`
  },
  {
    rule_id: 'KISA-5-01',
    category: '코드 오류',
    section_title: 'Null Pointer Dereference (널 포인터 참조)',
    content: '객체가 null인지 검증하지 않고 해당 객체의 메소드나 필드에 접근하여 프로그램이 비정상 종료(NPE Crash)되는 오류입니다.',
    penalty_level: '품질/안전성 결함',
    vulnerable_code: `// 취약한 예시 (Java)\nString userRole = user.getRole().getName();`,
    recommended_code: `// 안전한 예시 (Java - Null 검증 또는 Optional)\nif (user != null && user.getRole() != null) {\n    String userRole = user.getRole().getName();\n}`
  },

  // 4. 법령 고시 조항 (Law Regulations)
  {
    rule_id: 'PIPA-24',
    category: '개인정보 보호법',
    section_title: '개인정보 보호법 제24조 (고유식별정보의 처리 제한 및 암호화)',
    content: '주민등록번호, 여권번호, 운전면허번호, 외국인등록번호 등 고유식별정보를 처리할 때에는 다른 개인정보와 분리하여 암호화 조치(저장 및 전송 구간)를 취해야 합니다. 주민등록번호는 법령에 명시적 근거가 없는 한 수집이 금지됩니다.',
    penalty_level: '5년 이하의 징역 또는 5천만원 이하의 벌금 / 징벌적 과징금'
  },
  {
    rule_id: 'PIPA-29',
    category: '개인정보 보호법',
    section_title: '개인정보 보호법 제29조 (개인정보의 안전성 확보조치 기준)',
    content: '개인정보처리자는 개인정보가 분실·도난·유출·위조·변조 또는 훼손되지 아니하도록 내부관리계획 수립, 접근 통제, 개인정보의 암호화, 접속기록의 보관 및 위변조 방지 등 기술적·관리적 및 물리적 조치를 하여야 합니다.',
    penalty_level: '3천만원 이하의 과태료 / 시정명령'
  },
  {
    rule_id: 'ISMS-P-2.6',
    category: 'ISMS-P 고시',
    section_title: 'ISMS-P 2.6 암호화 적용 및 인증 기준',
    content: '정보자산 내 중요정보(비밀번호, 개인정보, 금융정보 등)의 저장 및 전송 시 안전한 암호화 알고리즘을 적용하고, 암호키의 생명주기(생성, 이용, 보관, 배포, 폐기)를 관리해야 합니다.',
    penalty_level: 'ISMS-P 인증 부적격'
  }
];

export function buildSeedDb(): void {
  console.log('🌱 KISA 지식 DB 시드 데이터 구축 시작...');
  const client = new KisaDbClient();

  // 1. 기본 KISA 문서 등록
  client.insertSection({
    rule_id: 'KISA-DOC-01',
    category: '가이드라인',
    section_title: 'KISA 소프트웨어 개발보안 가이드 (2021년 개정판)',
    content: '한국인터넷진흥원(KISA) 소프트웨어 개발보안 가이드 7대 카테고리 47개 보안 약점 가이드라인',
    penalty_level: 'KISA 표준'
  });

  // 2. 시드 조항들 렌더링
  let count = 0;
  for (const section of SEED_SECTIONS) {
    client.insertSection(section);
    count++;
  }

  client.logSync('SUCCESS', count, '최초 시드 데이터베이스 세팅 완료');
  console.log(`✅ KISA 지식 DB 시드 구축 완료 (${count}개 항목 저장됨)`);
  client.close();
}

if (require.main === module) {
  buildSeedDb();
}
