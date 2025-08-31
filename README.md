# Writing Practice App

A web application for daily writing practice with AI feedback.

## Features

- Daily writing practice with timer
- AI-powered feedback and scoring
- User authentication
- Token-based submission system
- Daily topics
- Submission history

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: Firebase

## Setup

### 방법 1: Docker를 사용한 가상화 환경 (권장)

1. Clone the repository

```bash
git clone [repository-url]
cd 300-challenge
```

2. Docker Desktop 실행
   - macOS: Applications 폴더에서 Docker.app 실행
   - Docker가 실행될 때까지 대기

3. 환경 변수 설정
   프로젝트 루트에 `.env` 파일 생성:

```bash
# 서버 설정
NODE_ENV=development
PORT=5000

# MongoDB 설정
MONGO_URI=mongodb://admin:password123@localhost:27017/300challenge?authSource=admin

# Firebase 설정 (실제 값으로 변경 필요)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# JWT 설정
JWT_SECRET=your-jwt-secret-key

# 이메일 설정
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 클라이언트 설정
VITE_API_URL=http://localhost:5000
```

4. Docker 컨테이너 실행

```bash
# 모든 서비스 실행 (MongoDB, 서버, 클라이언트)
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스만 실행
docker-compose up mongodb server
docker-compose up client
```

5. 애플리케이션 접속
   - 클라이언트: http://localhost:3000
   - 서버 API: http://localhost:5000
   - MongoDB: localhost:27017

### 방법 2: 로컬 개발 환경

1. Clone the repository

```bash
git clone [repository-url]
cd 300-challenge
```

2. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables
   Create `.env` files in both server and client directories with the following variables:

Server (.env):

```
PORT=5000
MONGO_URI=your_mongodb_uri
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
OPENAI_API_KEY=your_openai_api_key
```

Client (.env):

```
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

4. Start the development servers

```bash
# Start server
cd server
npm run dev

# Start client (새 터미널에서)
cd ../client
npm run dev
```

## Configuration

The application can be configured through the `config.ts` file in the client directory. Available options include:

- Token limits
- Character limits
- AI feedback settings
- Topic display settings

## 🚀 최근 업데이트 (2025-01-20)

### 🔄 멀티 디바이스 개발 환경 구축

**시공간을 초월한 끊김 없는 개발을 위한 환경 변수 동기화 시스템:**

#### 📱 사용 가능한 개발 환경:
- **메인 컴퓨터**: 집에서 사용하는 무거운 개발 머신
- **랩탑**: 밖에서 들고 다니는 가벼운 개발 머신
- **GitHub**: 코드 및 환경 설정 동기화

#### 🔧 환경 변수 동기화 방법:

```bash
# 1. 환경 변수 백업 (메인 컴퓨터에서)
./sync-env.sh
# 선택: 1 (현재 환경 변수를 .env 파일로 백업)

# 2. .env 파일을 다른 컴퓨터로 복사
# - USB, 클라우드, Git 등으로 전송

# 3. 환경 변수 복원 (다른 컴퓨터에서)
./sync-env.sh
# 선택: 2 (.env 파일에서 환경 변수 복원)
```

#### 📁 생성된 파일들:
- `env.template`: 환경 변수 템플릿
- `sync-env.sh`: 환경 변수 동기화 스크립트
- `.env`: 실제 환경 변수 (Git에 업로드되지 않음)

#### 💡 개발 워크플로우:
1. **메인 컴퓨터**에서 개발 → 환경 변수 백업
2. **GitHub**에 코드 푸시
3. **랩탑**에서 코드 풀 → 환경 변수 복원
4. **랩탑**에서 개발 → 환경 변수 백업
5. **메인 컴퓨터**에서 코드 풀 → 환경 변수 복원
6. **무한 반복** 🚀

## 🚀 최근 업데이트 (2025-01-20)

### 🔒 중복 제출 방지 시스템 개선 (업계 표준 적용)

**문제 해결:**

- MongoDB 정규표현식 에러 "quantifier does not follow a repeatable item" 완전 해결
- 정규표현식 대신 해시 기반 비교 + 단순 문자열 비교로 이중 안전장치 구현

**적용된 업계 표준:**

- **Google/Facebook 방식**: 해시 기반 빠른 중복 감지
- **Amazon/Netflix 방식**: 인덱스 활용 가능한 단순 쿼리
- **성능 최적화**: MongoDB 인덱스 자동 생성

**사용법:**

```bash
# 마이그레이션 실행 (기존 데이터에 textHash 추가)
cd server
npm run migrate-text-hash
```

## 향후 개발 계획

### 🚀 스마트 글쓰기 가이드 시스템 (개발 중)

현재 비활성화된 상태로 보관 중인 고도화된 글쓰기 가이드 기능들:

#### 📋 구현된 컴포넌트들

- **SmartWritingGuide**: 실시간 진행률 및 단계별 가이드
- **WritingStructureAnalyzer**: 글쓰기 구조 분석 및 점수 평가
- **EndingTemplateGuide**: 끝맺음 패턴 템플릿 제공
- **RealTimeWritingFeedback**: 실시간 글쓰기 품질 피드백

#### 🎯 고도화 방향

1. **AI 기반 개선 제안**: 더 정교한 글쓰기 패턴 분석
2. **개인화된 가이드**: 사용자별 글쓰기 스타일 학습
3. **게이미피케이션**: 점수 시스템과 배지 시스템
4. **사회적 학습**: 다른 사용자의 좋은 글쓰기 패턴 공유

#### 📁 관련 파일들

```
client/src/components/
├── SmartWritingGuide.tsx          # 메인 가이드 컴포넌트
├── WritingStructureAnalyzer.tsx   # 구조 분석기
├── EndingTemplateGuide.tsx        # 끝맺음 템플릿
└── RealTimeWritingFeedback.tsx    # 실시간 피드백
```

### 🔧 활성화 방법

필요시 다음 파일들의 주석을 해제하여 기능을 활성화할 수 있습니다:

- `client/src/pages/Write300.tsx`
- `client/src/pages/Write1000.tsx`

## License

Digiocean
