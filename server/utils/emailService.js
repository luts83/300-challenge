const nodemailer = require("nodemailer");
const User = require("../models/User");

// 이메일 전송을 위한 transporter 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Railway 환경에서 안정적인 연결을 위한 설정
  connectionTimeout: 30000, // 30초 연결 타임아웃
  greetingTimeout: 15000, // 15초 인사말 타임아웃
  socketTimeout: 30000, // 30초 소켓 타임아웃
  pool: true, // 연결 풀링 활성화
  maxConnections: 5, // 최대 연결 수
  maxMessages: 100, // 연결당 최대 메시지 수
  rateDelta: 20000, // 20초마다 연결 제한 해제
  rateLimit: 5, // 최대 5개 연결
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

// 이메일 전송 함수 (재시도 로직 포함)
async function sendFeedbackEmail(
  feedback,
  submission,
  canViewFeedback,
  retryCount = 0
) {
  const maxRetries = 3;
  const retryDelay = 2000; // 2초 대기

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: submission.user.email,
      subject: `[딜라이팅.AI] 새로운 피드백이 도착했습니다 - "${submission.title}"`,
      html: createFeedbackEmailTemplate(feedback, submission, canViewFeedback),
    };

    await transporter.sendMail(mailOptions);

    if (retryCount > 0) {
      console.log(
        `✅ 이메일 전송 성공 (재시도 ${retryCount}회 후): ${submission.user.email}`
      );
    }

    return true;
  } catch (error) {
    // 재시도 가능한 에러인지 확인
    const isRetryableError =
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      error.code === "ECONNREFUSED" ||
      error.message.includes("timeout");

    if (isRetryableError && retryCount < maxRetries) {
      console.log(
        `🔄 이메일 전송 재시도 ${retryCount + 1}/${maxRetries}: ${
          submission.user.email
        } (${error.code})`
      );

      // 재시도 전 대기
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * (retryCount + 1))
      );

      // 재시도
      return await sendFeedbackEmail(
        feedback,
        submission,
        canViewFeedback,
        retryCount + 1
      );
    }

    // 최종 실패 시 로그 기록
    console.error(
      `❌ 이메일 전송 실패 (${retryCount}회 재시도 후): ${submission.user.email}`,
      {
        error: error.message,
        code: error.code,
        submissionId: submission._id,
        feedbackId: feedback._id,
        retryCount: retryCount,
        timestamp: new Date().toISOString(),
      }
    );

    return false;
  }
}

module.exports = {
  sendFeedbackEmail,
};
