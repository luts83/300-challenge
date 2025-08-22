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

1. Clone the repository

```bash
git clone [repository-url]
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
PORT=3000
MONGODB_URI=your_mongodb_uri
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
OPENAI_API_KEY=your_openai_api_key
```

Client (.env):

```
VITE_API_URL=http://localhost:3000
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

# Start client
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
