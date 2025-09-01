const nodemailer = require("nodemailer");
const User = require("../models/User");
const dns = require("dns");

// Resend 서비스 import (Railway SMTP 차단 시 대안)
let resendService = null;
try {
  resendService = require("./resendEmailService");
} catch (error) {
  console.log(
    "⚠️ Resend 서비스가 설치되지 않았습니다. Gmail SMTP를 사용합니다."
  );
}

// 환경 변수 검증
function validateEmailConfig() {
  const requiredVars = ["EMAIL_USER", "EMAIL_PASSWORD"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error(
      "❌ [이메일 설정 오류] 필수 환경 변수가 누락되었습니다:",
      missing
    );
    return false;
  }

  console.log("✅ [이메일 설정] 환경 변수 검증 완료");
  console.log(`📧 [이메일 설정] 발신자: ${process.env.EMAIL_USER}`);
  return true;
}

// DNS 해석 테스트
async function testDNSResolution() {
  try {
    console.log("🔍 [네트워크 테스트] Gmail SMTP DNS 해석 중...");
    const addresses = await dns.promises.resolve4("smtp.gmail.com");
    console.log("✅ [네트워크 테스트] Gmail SMTP DNS 해석 성공:", addresses);
    return true;
  } catch (error) {
    console.error(
      "❌ [네트워크 테스트] Gmail SMTP DNS 해석 실패:",
      error.message
    );
    return false;
  }
}

// 이메일 전송을 위한 transporter 설정
function createTransporter() {
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  // Gmail 설정
  if (emailService === "gmail") {
    return nodemailer.createTransport({
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
      // 디버깅을 위한 추가 설정
      debug: process.env.NODE_ENV === "development", // 개발 환경에서만 디버그 모드
      logger: process.env.NODE_ENV === "development", // 개발 환경에서만 로거 활성화
    });
  }

  // SendGrid 설정 (대안)
  if (emailService === "sendgrid") {
    return nodemailer.createTransporter({
      service: "SendGrid",
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }

  // 커스텀 SMTP 설정
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 20000,
    rateLimit: 5,
    debug: process.env.NODE_ENV === "development",
    logger: process.env.NODE_ENV === "development",
  });
}

const transporter = createTransporter();

// SMTP 연결 테스트 함수
async function testSMTPConnection() {
  try {
    console.log("🔌 [SMTP 테스트] 연결 시도 중...");
    await transporter.verify();
    console.log("✅ [SMTP 테스트] 연결 성공!");
    return true;
  } catch (error) {
    console.error("❌ [SMTP 테스트] 연결 실패:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return false;
  }
}

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

  // 첫 번째 시도 시 환경 검증
  if (retryCount === 0) {
    console.log("🔍 [이메일 전송] 환경 검증 시작...");

    // Resend 사용 가능한지 확인 (Railway SMTP 차단 시 대안)
    if (resendService && process.env.RESEND_API_KEY) {
      console.log(
        "📧 [이메일 전송] Resend 서비스 사용 (Railway SMTP 차단 대응)"
      );
      return await resendService.sendFeedbackEmail(
        feedback,
        submission,
        canViewFeedback,
        retryCount
      );
    }

    // 환경 변수 검증
    if (!validateEmailConfig()) {
      console.error("❌ [이메일 전송] 환경 변수 검증 실패");
      return false;
    }

    // DNS 해석 테스트
    const dnsSuccess = await testDNSResolution();
    if (!dnsSuccess) {
      console.error("❌ [이메일 전송] DNS 해석 실패");
      return false;
    }

    // SMTP 연결 테스트
    const smtpSuccess = await testSMTPConnection();
    if (!smtpSuccess) {
      console.error("❌ [이메일 전송] SMTP 연결 테스트 실패");
      console.log(
        "💡 Railway SMTP 차단 가능성. Resend 서비스 사용을 권장합니다."
      );
      return false;
    }

    console.log("✅ [이메일 전송] 환경 검증 완료, 이메일 전송 시작");
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: submission.user.email,
      subject: `[딜라이팅.AI] 새로운 피드백이 도착했습니다 - "${submission.title}"`,
      html: createFeedbackEmailTemplate(feedback, submission, canViewFeedback),
    };

    console.log(
      `📧 [이메일 전송] ${submission.user.email}에게 전송 시도 중... (시도 ${
        retryCount + 1
      }/${maxRetries + 1})`
    );

    const startTime = Date.now();
    await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    if (retryCount > 0) {
      console.log(
        `✅ 이메일 전송 성공 (재시도 ${retryCount}회 후): ${submission.user.email} (${duration}ms)`
      );
    } else {
      console.log(
        `✅ 이메일 전송 성공: ${submission.user.email} (${duration}ms)`
      );
    }

    return true;
  } catch (error) {
    const duration = Date.now() - (retryCount === 0 ? Date.now() : Date.now());

    // 상세한 오류 정보 수집
    const errorDetails = {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      port: error.port,
      address: error.address,
      family: error.family,
      submissionId: submission._id,
      feedbackId: feedback._id,
      retryCount: retryCount,
      timestamp: new Date().toISOString(),
    };

    console.error(
      `❌ [이메일 전송 오류] ${submission.user.email} (시도 ${retryCount + 1}/${
        maxRetries + 1
      }):`,
      errorDetails
    );

    // 재시도 가능한 에러인지 확인
    const isRetryableError =
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNABORTED" ||
      error.message.includes("timeout") ||
      error.message.includes("connection");

    if (isRetryableError && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount); // 지수 백오프
      console.log(
        `🔄 이메일 전송 재시도 ${retryCount + 1}/${maxRetries}: ${
          submission.user.email
        } (${error.code}) - ${delay}ms 후 재시도`
      );

      // 재시도 전 대기
      await new Promise((resolve) => setTimeout(resolve, delay));

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
      errorDetails
    );

    return false;
  }
}

module.exports = {
  sendFeedbackEmail,
  validateEmailConfig,
  testDNSResolution,
  testSMTPConnection,
};
