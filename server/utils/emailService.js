const nodemailer = require("nodemailer");
const User = require("../models/User");

// ✅ 이메일 전송 통계 모니터링
const emailStats = {
  totalSent: 0,
  totalFailed: 0,
  lastSuccess: null,
  lastFailure: null,
  averageDuration: 0,
  errorCounts: {},
  reset() {
    this.totalSent = 0;
    this.totalFailed = 0;
    this.lastSuccess = null;
    this.lastFailure = null;
    this.averageDuration = 0;
    this.errorCounts = {};
  }
};

// ✅ 이메일 전송 통계 조회 함수
function getEmailStats() {
  return {
    ...emailStats,
    successRate: emailStats.totalSent + emailStats.totalFailed > 0 
      ? ((emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) * 100).toFixed(2) + '%'
      : '0%',
    lastSuccessFormatted: emailStats.lastSuccess ? new Date(emailStats.lastSuccess).toLocaleString() : '없음',
    lastFailureFormatted: emailStats.lastFailure ? new Date(emailStats.lastFailure).toLocaleString() : '없음',
    errorBreakdown: emailStats.errorCounts
  };
}

// 이메일 전송을 위한 transporter 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // ✅ 연결 안정성 향상을 위한 설정 추가
  connectionTimeout: 60000, // 60초 연결 타임아웃
  greetingTimeout: 30000,  // 30초 인사 타임아웃
  socketTimeout: 60000,    // 60초 소켓 타임아웃
  pool: true,              // 연결 풀 사용
  maxConnections: 5,       // 최대 연결 수
  maxMessages: 100,        // 연결당 최대 메시지 수
  rateLimit: 14,           // 초당 최대 메시지 수 (Gmail 제한)
});

// 피드백 알림 이메일 템플릿
const createFeedbackEmailTemplate = (feedback, submission, canViewFeedback) => {
  const baseTemplate = `
    <h2>새로운 피드백이 도착했습니다!</h2>
    <p>안녕하세요, ${submission.user.displayName}님!</p>
    <p>귀하의 글 "${submission.title}"에 새로운 피드백이 달렸습니다.</p>
    <hr>
  `;

  const unlockMessage = canViewFeedback
    ? `
      <p>지금 바로 웹사이트에서 피드백 내용을 확인해보세요!</p>
      <p><a href="${process.env.CLIENT_URL}/submissions/${submission._id}" style="padding: 10px 20px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px;">피드백 확인하기</a></p>
    `
    : `
      <h3>피드백 열람 조건</h3>
      <p>다른 사용자의 글에 피드백 3개를 작성하시면 피드백 열람 권한이 활성화됩니다.</p>
      <p>지금 바로 다른 사용자의 글에 피드백을 남기고 성장하는 커뮤니티에 참여해보세요!</p>
      <p><a href="${process.env.CLIENT_URL}/feedback-camp" style="padding: 10px 20px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px;">피드백 작성하러 가기</a></p>
    `;

  return baseTemplate + unlockMessage;
};

// 이메일 전송 함수
async function sendFeedbackEmail(feedback, submission, canViewFeedback = false) {
  const emailStartTime = Date.now();
  
  try {
    // ✅ 이메일 전송 시작 로깅
    console.log(`📧 [이메일 서비스] ${submission.user.email}에게 피드백 알림 전송 시작`);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: submission.user.email,
      subject: `[딜라이팅.AI] 새로운 피드백이 도착했습니다 - "${submission.title}"`,
      html: createFeedbackEmailTemplate(feedback, submission, canViewFeedback),
    };

    // ✅ 연결 타임아웃 설정 추가
    const result = await transporter.sendMail(mailOptions);
    
    const emailDuration = Date.now() - emailStartTime;
    
    // ✅ 이메일 전송 성공 상세 로깅
    console.log(`✅ [이메일 서비스] ${submission.user.email}에게 피드백 알림 전송 성공 (${emailDuration}ms)`);
    console.log(`   📨 메시지 ID: ${result.messageId}`);
    console.log(`   📧 발신자: ${process.env.EMAIL_USER}`);
    console.log(`   📬 수신자: ${submission.user.email}`);
    console.log(`   📝 제목: ${mailOptions.subject}`);
    
    // ✅ 성공 통계 업데이트
    emailStats.totalSent++;
    emailStats.lastSuccess = Date.now();
    emailStats.averageDuration = (emailStats.averageDuration * (emailStats.totalSent - 1) + emailDuration) / emailStats.totalSent;
    
    return true;
  } catch (error) {
    const emailDuration = Date.now() - emailStartTime;
    
    // ✅ 이메일 전송 실패 상세 로깅
    console.error(`❌ [이메일 서비스] ${submission.user.email}에게 피드백 알림 전송 실패 (${emailDuration}ms)`);
    console.error(`   🔴 에러 코드: ${error.code}`);
    console.error(`   🔴 에러 메시지: ${error.message}`);
    console.error(`   📧 발신자: ${process.env.EMAIL_USER}`);
    console.error(`   📬 수신자: ${submission.user.email}`);
    
    // ✅ 구체적인 에러 분석 및 로깅
    if (error.code === 'ETIMEDOUT') {
      console.error("🔴 연결 타임아웃 - SMTP 서버 연결 실패");
      console.error("   💡 해결방법: 네트워크 연결, 방화벽 설정, Gmail 정책 확인");
    } else if (error.code === 'EAUTH') {
      console.error("🔴 인증 실패 - 이메일 계정 정보 확인 필요");
      console.error("   💡 해결방법: EMAIL_USER, EMAIL_PASSWORD 환경변수 확인");
    } else if (error.code === 'ECONNECTION') {
      console.error("🔴 연결 실패 - 네트워크 또는 방화벽 문제");
      console.error("   💡 해결방법: 서버 네트워크 설정, Gmail SMTP 포트(587) 확인");
    } else if (error.code === 'EMESSAGE') {
      console.error("🔴 메시지 전송 실패 - 이메일 내용 문제");
      console.error("   💡 해결방법: 이메일 템플릿, 제목, 내용 확인");
    } else {
      console.error("🔴 알 수 없는 에러 - 추가 디버깅 필요");
      console.error("   💡 전체 에러 객체:", error);
    }
    
    // ✅ 실패 통계 업데이트
    emailStats.totalFailed++;
    emailStats.lastFailure = Date.now();
    const errorType = error.code || 'UNKNOWN';
    emailStats.errorCounts[errorType] = (emailStats.errorCounts[errorType] || 0) + 1;
    
    return false;
  }
}

module.exports = {
  sendFeedbackEmail,
  getEmailStats,  // ✅ 이메일 전송 통계 조회
  emailStats,     // ✅ 통계 객체 직접 접근 (개발/디버깅용)
};
