# 🚀 300 Challenge 프로젝트 배포 가이드

## 📋 최신 업데이트 내용 (2025-01-27)

### 🔧 주요 변경사항
- **피드백 제한 시스템 개선**: 하루 최대 5개 제한을 무제한으로 변경
- **이메일 서비스 안정성 개선**: Resend 이메일 서비스 구축으로 Railway SMTP 차단 문제 해결
- **개발 환경 최적화**: Docker 환경 및 환경 변수 동기화 시스템 구축

### 📝 상세 변경사항
1. **피드백 시스템 개선**
   - `server/controllers/feedbackController.js`에서 피드백 제한 로직 제거
   - 사용자들이 무제한으로 피드백을 작성할 수 있도록 개선
   - 커뮤니티 활성화 및 상호작용 증가 기대

2. **이메일 서비스 개선**
   - Railway SMTP 차단 문제로 인한 Resend 이메일 서비스 도입
   - 이메일 전송 실패 시 상세 로깅 시스템 구축
   - 이메일 전송 파라미터 오류 수정

3. **개발 환경 개선**
   - Docker 환경 구축
   - 환경 변수 동기화 시스템 (`sync-env.sh`)
   - 보안 도구 및 암호화 스크립트 추가

---

## 🛠️ 다른 컴퓨터에서 원스톱 설정 가이드

### 1️⃣ 사전 요구사항
```bash
# Node.js 18+ 설치 확인
node --version

# Git 설치 확인
git --version

# Docker 설치 (선택사항 - 로컬 개발용)
docker --version
```

### 2️⃣ 프로젝트 클론 및 설정
```bash
# 프로젝트 클론
git clone https://github.com/luts83/300-challenge.git
cd 300-challenge

# 최신 변경사항 pull
git pull origin main
```

### 3️⃣ 환경 변수 설정
```bash
# 환경 변수 템플릿 복사
cp env.template .env

# 환경 변수 파일 편집 (필수 설정)
nano .env
```

#### 🔑 필수 환경 변수 설정
```env
# MongoDB 연결
MONGO_URI=mongodb://localhost:27017/300challenge

# Firebase 설정
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email

# 이메일 서비스 (Resend)
RESEND_API_KEY=your-resend-api-key
ADMIN_EMAIL=admin@example.com

# JWT 시크릿
JWT_SECRET=your-jwt-secret

# 클라이언트 URL
CLIENT_URL=http://localhost:5173
```

### 4️⃣ 의존성 설치
```bash
# 루트 디렉토리에서
npm install

# 서버 디렉토리에서
cd server
npm install

# 클라이언트 디렉토리에서
cd ../client
npm install
```

### 5️⃣ 데이터베이스 설정
```bash
# MongoDB 설치 및 실행 (macOS)
brew install mongodb-community
brew services start mongodb-community

# 또는 Docker 사용
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 6️⃣ 개발 서버 실행
```bash
# 루트 디렉토리에서
npm run dev

# 또는 개별 실행
# 터미널 1: 서버
cd server && npm run dev

# 터미널 2: 클라이언트
cd client && npm run dev
```

---

## 🔧 추가 설정 도구

### 환경 변수 동기화
```bash
# 환경 변수 동기화 (팀원 간 공유용)
./sync-env.sh

# 환경 변수 암호화
./encrypt-env.sh
```

### 데이터베이스 마이그레이션
```bash
# 사용자 프로필 마이그레이션
cd server/scripts
node migrateToUserProfiles.js

# 토큰 히스토리 마이그레이션
node migrateUserTokenHistory.js
```

---

## 🚨 주의사항

### 1. 이메일 서비스 설정
- Resend API 키가 필요합니다
- 관리자 이메일 주소를 올바르게 설정해야 합니다
- 이메일 템플릿이 올바르게 구성되어야 합니다

### 2. Firebase 설정
- Firebase 프로젝트 설정이 완료되어야 합니다
- 서비스 계정 키 파일이 올바른 위치에 있어야 합니다

### 3. 데이터베이스 연결
- MongoDB가 실행 중이어야 합니다
- 데이터베이스 인덱스가 올바르게 설정되어야 합니다

---

## 🐛 문제 해결

### 일반적인 문제들
1. **포트 충돌**: 3000번 포트가 사용 중인 경우 다른 포트로 변경
2. **MongoDB 연결 실패**: MongoDB 서비스가 실행 중인지 확인
3. **이메일 전송 실패**: Resend API 키와 관리자 이메일 설정 확인

### 로그 확인
```bash
# 서버 로그 확인
cd server && npm run dev

# 클라이언트 빌드 로그 확인
cd client && npm run build
```

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 모든 의존성이 올바르게 설치되었는지
2. 환경 변수가 올바르게 설정되었는지
3. 데이터베이스가 실행 중인지
4. 포트가 사용 가능한지

추가 지원이 필요한 경우 프로젝트 이슈를 생성하거나 팀원에게 문의하세요.
