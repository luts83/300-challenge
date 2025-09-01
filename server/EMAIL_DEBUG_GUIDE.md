# 이메일 전송 디버깅 가이드

## 🚨 문제 상황

배포 환경에서 이메일 전송이 실패하고 ETIMEDOUT 오류가 발생하는 경우를 위한 종합 디버깅 가이드입니다.

## 🔍 디버깅 도구

### 1. 종합 이메일 디버깅 테스트

```bash
cd server
npm run test-email-debug
```

이 스크립트는 다음을 테스트합니다:

- ✅ 환경 변수 검증
- 🌐 DNS 해석 테스트
- 🔌 SMTP 연결 테스트
- 🗄️ MongoDB 연결 테스트
- 📧 실제 이메일 전송 테스트

### 2. 기존 테스트 도구들

```bash
# SMTP 연결 테스트
npm run test-smtp

# 네트워크 연결 테스트
npm run test-network
```

## 🛠️ 해결 방법

### 1. 환경 변수 확인

다음 환경 변수들이 올바르게 설정되어 있는지 확인하세요:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

**중요**: `EMAIL_PASSWORD`는 Gmail 앱 비밀번호를 사용해야 합니다.

### 2. Gmail 앱 비밀번호 설정

1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 16자리 비밀번호를 `EMAIL_PASSWORD`에 설정

### 3. Railway/배포 환경 네트워크 정책

Railway에서 Gmail SMTP 포트가 차단될 수 있습니다:

- 포트 587 (STARTTLS)
- 포트 465 (SSL)

### 4. 대안 이메일 서비스 사용

#### SendGrid 사용

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### 커스텀 SMTP 서버 사용

```env
EMAIL_SERVICE=custom
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
```

## 📊 로그 분석

### 성공적인 이메일 전송 로그

```
✅ [이메일 설정] 환경 변수 검증 완료
📧 [이메일 설정] 발신자: your-email@gmail.com
✅ [네트워크 테스트] Gmail SMTP DNS 해석 성공: [142.250.191.109]
✅ [SMTP 테스트] 연결 성공!
📧 [이메일 전송] user@example.com에게 전송 시도 중... (시도 1/4)
✅ 이메일 전송 성공: user@example.com (1234ms)
```

### 실패한 이메일 전송 로그

```
❌ [이메일 전송 오류] user@example.com (시도 1/4): {
  message: 'Connection timeout',
  code: 'ETIMEDOUT',
  command: 'CONN',
  response: undefined,
  responseCode: undefined,
  errno: -110,
  syscall: 'connect',
  hostname: 'smtp.gmail.com',
  port: 587
}
🔄 이메일 전송 재시도 1/3: user@example.com (ETIMEDOUT) - 2000ms 후 재시도
```

## 🔧 문제 해결 단계

### 1단계: 기본 확인

```bash
npm run test-email-debug
```

### 2단계: 네트워크 문제인 경우

- Railway 대시보드에서 네트워크 설정 확인
- 방화벽 정책 확인
- 다른 이메일 서비스로 변경 고려

### 3단계: 인증 문제인 경우

- Gmail 앱 비밀번호 재생성
- 2단계 인증 활성화 확인
- 계정 보안 설정 확인

### 4단계: 대안 서비스 사용

- SendGrid 계정 생성 및 API 키 설정
- 또는 다른 SMTP 서비스 사용

## 📈 모니터링

### 관리자 알림

`ADMIN_EMAIL` 환경 변수를 설정하면 이메일 전송 실패 시 관리자에게 알림이 전송됩니다.

### 로그 모니터링

다음 로그를 모니터링하여 이메일 전송 상태를 추적하세요:

- `✅ [이메일 전송 성공]`
- `❌ [이메일 전송 실패]`
- `🔄 이메일 전송 재시도`

## 🚀 배포 시 체크리스트

- [ ] 환경 변수 설정 확인
- [ ] Gmail 앱 비밀번호 설정
- [ ] `npm run test-email-debug` 실행
- [ ] 관리자 이메일 설정
- [ ] 대안 이메일 서비스 준비 (필요시)

## 💡 추가 팁

1. **개발 환경에서 테스트**: 로컬에서 먼저 테스트한 후 배포
2. **점진적 배포**: 이메일 기능을 단계적으로 활성화
3. **백업 계획**: 이메일 전송 실패 시 대안 알림 방법 준비
4. **모니터링 설정**: 이메일 전송 실패율 모니터링

## 🆘 여전히 문제가 있다면

1. Railway 로그에서 상세한 오류 메시지 확인
2. `npm run test-email-debug` 결과를 확인
3. 네트워크 연결 상태 점검
4. 다른 이메일 서비스로 전환 고려
