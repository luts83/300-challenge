const nodemailer = require("nodemailer");
const User = require("../models/User");
const { checkEmailAccess } = require("../controllers/userController");

// Resend 서비스 import (Railway SMTP 차단 시 대안)
let resendService = null;
try {
  resendService = require("./resendEmailService");
} catch (error) {
  console.log(
    "⚠️ Resend 서비스가 설치되지 않았습니다. Gmail SMTP를 사용합니다."
  );
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

  // 커스텀 SMTP 설정
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
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

// 웰컴 이메일 템플릿 생성
const createWelcomeEmailTemplate = (user, isWhitelisted) => {
  const tokenRules = isWhitelisted
    ? `
      <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #0c4a6e; margin: 0 0 12px 0;">⭐ 챌린지 참여자 혜택</h3>
        <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
          <li>300자 토큰: 매일 1개 지급</li>
          <li>1000자 토큰: 주간 1개 지급</li>
        </ul>
        <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 12px; margin-top: 12px;">
          <p style="color: #1e40af; margin: 0; font-size: 14px; font-weight: 600;">
            🎉 챌린지 신청자로 선정되어 매일 토큰을 받을 수 있습니다!
          </p>
        </div>
      </div>
    `
    : `
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #92400e; margin: 0 0 12px 0;">🎁 신규 사용자 혜택 (7일 이내)</h3>
        <ul style="color: #92400e; margin: 0 0 12px 0; padding-left: 20px;">
          <li>300자 토큰: 매일 1개 지급</li>
          <li>1000자 토큰: 주간 1개 지급</li>
        </ul>
        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 12px; margin-top: 12px;">
          <p style="color: #991b1b; margin: 0; font-size: 14px;">
            <strong>⚠️ 중요:</strong> 가입 7일 이후에는 300자와 1000자 토큰 모두 주간 1개씩만 지급됩니다.
          </p>
        </div>
      </div>
    `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>딜라이팅.AI에 오신 것을 환영합니다!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">🎉 환영합니다!</h1>
        <p style="color: #6b7280; margin: 8px 0 0 0;">딜라이팅.AI 글쓰기 챌린지</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">안녕하세요, ${user.displayName}님!</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
          딜라이팅.AI 글쓰기 챌린지 플랫폼에 가입해주셔서 감사합니다! 
          이제 매일 글을 쓰며 성장하는 여정을 시작해보세요.
        </p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0;">🪙 토큰 시스템 안내</h3>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
          저희 플랫폼은 토큰 시스템을 통해 글쓰기를 관리합니다. 
          토큰을 사용하여 300자 타임어택과 1000자 타이머 글쓰기에 참여할 수 있습니다.
        </p>
        
        ${tokenRules}
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0;">🚀 시작하기</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; text-align: center;">
            <h4 style="color: #1e40af; margin: 0 0 8px 0;">🟢 300자 타임어택</h4>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">빠른 글쓰기 연습</p>
          </div>
          <div style="background-color: #e0e7ff; border: 1px solid #6366f1; border-radius: 8px; padding: 16px; text-align: center;">
            <h4 style="color: #3730a3; margin: 0 0 8px 0;">🔵 1000자 타이머</h4>
            <p style="color: #3730a3; margin: 0; font-size: 14px;">깊이 있는 글쓰기</p>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            지금 시작하기
          </a>
        </div>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h4 style="color: #15803d; margin: 0 0 8px 0;">💡 첫 글쓰기 팁</h4>
        <ul style="color: #15803d; margin: 0; padding-left: 20px; font-size: 14px;">
          <li>완벽하지 않아도 괜찮습니다. 일단 시작해보세요!</li>
          <li>매일 조금씩이라도 꾸준히 쓰는 것이 중요합니다.</li>
          <li>다른 사용자의 피드백을 통해 성장해보세요.</li>
        </ul>
      </div>

      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          궁금한 점이 있으시면 언제든 문의해주세요.<br>
          <a href="mailto:hello@digiocean.co.kr" style="color: #2563eb;">hello@digiocean.co.kr</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

// 3일 후 팁 이메일 템플릿
const createTipEmailTemplate = (user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>300자 토큰 활용 팁</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0;">💡 글쓰기 팁</h1>
        <p style="color: #6b7280; margin: 8px 0 0 0;">300자 토큰 활용법</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0;">안녕하세요, ${user.displayName}님!</h2>
        <p style="margin: 0 0 16px 0; color: #4b5563;">
          가입한 지 3일이 지났습니다! 300자 토큰을 더 효과적으로 활용하는 방법을 알려드릴게요.
        </p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0;">🟢 300자 타임어택 활용법</h3>
        
        <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #15803d; margin: 0 0 8px 0;">📝 글쓰기 전략</h4>
          <ul style="color: #15803d; margin: 0; padding-left: 20px; font-size: 14px;">
            <li><strong>주제 파악:</strong> 먼저 주제를 읽고 핵심 키워드를 정리하세요</li>
            <li><strong>구조 잡기:</strong> 도입-본문-결론의 3단 구조를 염두에 두세요</li>
            <li><strong>시간 관리:</strong> 5분 계획, 20분 작성, 5분 검토로 나누어 진행하세요</li>
          </ul>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #92400e; margin: 0 0 8px 0;">🎯 점수 향상 팁</h4>
          <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px;">
            <li><strong>구체성:</strong> 추상적인 표현보다 구체적인 예시를 들어보세요</li>
            <li><strong>논리성:</strong> 주장과 근거를 명확히 연결하세요</li>
            <li><strong>창의성:</strong> 독창적인 관점이나 해석을 시도해보세요</li>
          </ul>
        </div>

        <div style="background-color: #e0e7ff; border: 1px solid #6366f1; border-radius: 8px; padding: 16px;">
          <h4 style="color: #3730a3; margin: 0 0 8px 0;">🔄 피드백 활용법</h4>
          <ul style="color: #3730a3; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>받은 피드백을 꼼꼼히 읽고 다음 글에 반영해보세요</li>
            <li>다른 사용자의 글에 피드백을 남겨 커뮤니티에 기여하세요</li>
            <li>피드백을 통해 새로운 관점을 발견해보세요</li>
          </ul>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${process.env.CLIENT_URL}/write/300" 
           style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          300자 글쓰기 시작하기
        </a>
      </div>

      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          꾸준한 연습이 실력 향상의 지름길입니다!<br>
          <a href="${process.env.CLIENT_URL}" style="color: #2563eb;">딜라이팅.AI</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

// 7일 전 알림 이메일 템플릿
const createSevenDayNoticeTemplate = (user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>토큰 지급 정책 변경 안내</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #f59e0b; margin: 0;">⚠️ 중요 안내</h1>
        <p style="color: #6b7280; margin: 8px 0 0 0;">토큰 지급 정책 변경</p>
      </div>

      <div style="background-color: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #92400e; margin: 0 0 16px 0;">안녕하세요, ${user.displayName}님!</h2>
        <p style="margin: 0 0 16px 0; color: #92400e;">
          가입한 지 7일이 지나면 토큰 지급 정책이 변경됩니다. 
          미리 알아두시면 더 효과적으로 플랫폼을 활용하실 수 있어요.
        </p>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0;">📅 변경되는 토큰 정책</h3>
        
        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #991b1b; margin: 0 0 8px 0;">현재 (7일 이내)</h4>
          <ul style="color: #991b1b; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>300자 토큰: 매일 1개 지급</li>
            <li>1000자 토큰: 주간 1개 지급</li>
          </ul>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="color: #0c4a6e; margin: 0 0 8px 0;">변경 후 (7일 이후)</h4>
          <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>300자 토큰: 주간 1개 지급</li>
            <li>1000자 토큰: 주간 1개 지급</li>
          </ul>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px;">
          <h4 style="color: #15803d; margin: 0 0 8px 0;">💡 대응 전략</h4>
          <ul style="color: #15803d; margin: 0; padding-left: 20px; font-size: 14px;">
            <li>남은 기간 동안 300자 토큰을 최대한 활용하세요</li>
            <li>주간 토큰을 효율적으로 사용하는 습관을 기르세요</li>
            <li>피드백을 통해 글쓰기 실력을 빠르게 향상시키세요</li>
          </ul>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${process.env.CLIENT_URL}" 
           style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          지금 바로 시작하기
        </a>
      </div>

      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">
          궁금한 점이 있으시면 언제든 문의해주세요.<br>
          <a href="mailto:hello@digiocean.co.kr" style="color: #2563eb;">hello@digiocean.co.kr</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

// 이메일 전송 함수
async function sendWelcomeEmail(user, emailType = "welcome", retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 2000;

  // 첫 번째 시도 시 Resend 사용 가능한지 확인
  if (retryCount === 0 && resendService && process.env.RESEND_API_KEY) {
    console.log("📧 [웰컴 이메일] Resend 서비스 사용");
    return await resendService.sendWelcomeEmail(user, emailType, retryCount);
  }

  try {
    let subject, html;

    switch (emailType) {
      case "welcome":
        const isWhitelisted = await checkEmailAccess(user.email);
        subject = `[딜라이팅.AI] 환영합니다! ${user.displayName}님`;
        html = createWelcomeEmailTemplate(user, isWhitelisted);
        break;
      case "tip":
        subject = `[딜라이팅.AI] 300자 토큰 활용 팁`;
        html = createTipEmailTemplate(user);
        break;
      case "sevenDayNotice":
        subject = `[딜라이팅.AI] 토큰 지급 정책 변경 안내`;
        html = createSevenDayNoticeTemplate(user);
        break;
      default:
        throw new Error(`알 수 없는 이메일 타입: ${emailType}`);
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: subject,
      html: html,
    };

    console.log(
      `📧 [웰컴 이메일] ${
        user.email
      }에게 ${emailType} 이메일 전송 시도 중... (시도 ${retryCount + 1}/${
        maxRetries + 1
      })`
    );

    const startTime = Date.now();
    await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log(
      `✅ 웰컴 이메일 전송 성공: ${user.email} (${emailType}, ${duration}ms)`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ [웰컴 이메일 오류] ${user.email} (${emailType}, 시도 ${
        retryCount + 1
      }/${maxRetries + 1}):`,
      {
        message: error.message,
        code: error.code,
        emailType,
        retryCount,
        timestamp: new Date().toISOString(),
      }
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
      const delay = retryDelay * Math.pow(2, retryCount);
      console.log(
        `🔄 웰컴 이메일 재시도 ${retryCount + 1}/${maxRetries}: ${
          user.email
        } (${emailType}) - ${delay}ms 후 재시도`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return await sendWelcomeEmail(user, emailType, retryCount + 1);
    }

    console.error(
      `❌ 웰컴 이메일 전송 실패 (${retryCount}회 재시도 후): ${user.email} (${emailType})`
    );
    return false;
  }
}

module.exports = {
  sendWelcomeEmail,
};
