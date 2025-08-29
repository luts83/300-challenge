const nodemailer = require("nodemailer");
const User = require("../models/User");

// 이메일 전송을 위한 transporter 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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
async function sendFeedbackEmail(feedback, submission, canViewFeedback) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: submission.user.email,
      subject: `[딜라이팅.AI] 새로운 피드백이 도착했습니다 - "${submission.title}"`,
      html: createFeedbackEmailTemplate(feedback, submission, canViewFeedback),
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    // 이메일 전송 실패 시 조용히 처리
    return false;
  }
}

module.exports = {
  sendFeedbackEmail,
};
