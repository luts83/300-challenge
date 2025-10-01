const { Resend } = require("resend");

// Resend 클라이언트 초기화
const resend = new Resend(process.env.RESEND_API_KEY);

// 환경 변수 검증
function validateResendConfig() {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      "❌ [Resend 설정 오류] RESEND_API_KEY 환경 변수가 누락되었습니다."
    );
    return false;
  }

  console.log("✅ [Resend 설정] 환경 변수 검증 완료");
  console.log(`📧 [Resend 설정] 발신자: ${process.env.EMAIL_USER}`);
  return true;
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

// Resend를 사용한 이메일 전송 함수
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
    console.log("🔍 [Resend 이메일 전송] 환경 검증 시작...");

    // 환경 변수 검증
    if (!validateResendConfig()) {
      console.error("❌ [Resend 이메일 전송] 환경 변수 검증 실패");
      return false;
    }

    console.log("✅ [Resend 이메일 전송] 환경 검증 완료, 이메일 전송 시작");
  }

  try {
    const emailData = {
      from: "hello@digiocean.co.kr", // 커스텀 도메인 사용
      to: [submission.user.email],
      subject: `[딜라이팅.AI] 새로운 피드백이 도착했습니다 - "${submission.title}"`,
      html: createFeedbackEmailTemplate(feedback, submission, canViewFeedback),
    };

    console.log(
      `📧 [Resend 이메일 전송] ${
        submission.user.email
      }에게 전송 시도 중... (시도 ${retryCount + 1}/${maxRetries + 1})`
    );

    const startTime = Date.now();
    const result = await resend.emails.send(emailData);
    const duration = Date.now() - startTime;

    if (result.error) {
      throw new Error(result.error.message || "Resend API 오류");
    }

    if (retryCount > 0) {
      console.log(
        `✅ Resend 이메일 전송 성공 (재시도 ${retryCount}회 후): ${submission.user.email} (${duration}ms)`
      );
    } else {
      console.log(
        `✅ Resend 이메일 전송 성공: ${submission.user.email} (${duration}ms)`
      );
    }

    console.log(`📧 Resend Message ID: ${result.data?.id}`);

    return true;
  } catch (error) {
    // 상세한 오류 정보 수집
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      submissionId: submission._id,
      feedbackId: feedback._id,
      retryCount: retryCount,
      timestamp: new Date().toISOString(),
    };

    console.error(
      `❌ [Resend 이메일 전송 오류] ${submission.user.email} (시도 ${
        retryCount + 1
      }/${maxRetries + 1}):`,
      errorDetails
    );

    // 재시도 가능한 에러인지 확인
    const isRetryableError =
      error.message.includes("timeout") ||
      error.message.includes("network") ||
      error.message.includes("connection") ||
      error.message.includes("rate limit") ||
      error.message.includes("temporary");

    if (isRetryableError && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount); // 지수 백오프
      console.log(
        `🔄 Resend 이메일 전송 재시도 ${retryCount + 1}/${maxRetries}: ${
          submission.user.email
        } - ${delay}ms 후 재시도`
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
      `❌ Resend 이메일 전송 실패 (${retryCount}회 재시도 후): ${submission.user.email}`,
      errorDetails
    );

    return false;
  }
}

// Resend 연결 테스트 함수
async function testResendConnection() {
  try {
    console.log("🔌 [Resend 테스트] 연결 시도 중...");

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
    }

    console.log(
      `🔑 [Resend 테스트] API 키: ${process.env.RESEND_API_KEY.substring(
        0,
        10
      )}...`
    );

    // 간단한 테스트 이메일 전송 (실제 이메일로)
    const testResult = await resend.emails.send({
      from: "hello@digiocean.co.kr", // 커스텀 도메인 사용
      to: ["lee.sanggean@gmail.com"], // 실제 테스트 이메일
      subject: "🔍 Resend 연결 테스트 - " + new Date().toISOString(),
      html: `
        <h2>Resend 연결 테스트</h2>
        <p>이 이메일은 Resend API 연결을 테스트하기 위해 전송되었습니다.</p>
        <p><strong>전송 시간:</strong> ${new Date().toISOString()}</p>
        <p><strong>환경:</strong> Railway Production</p>
        <hr>
        <p><em>테스트용 이메일입니다.</em></p>
      `,
    });

    console.log("📧 [Resend 테스트] API 응답:", testResult);

    if (testResult.error) {
      console.error("❌ [Resend 테스트] API 오류:", testResult.error);
      throw new Error(testResult.error.message || "Resend API 오류");
    }

    console.log("✅ [Resend 테스트] 연결 성공!");
    console.log(`📧 [Resend 테스트] Message ID: ${testResult.data?.id}`);
    return true;
  } catch (error) {
    console.error("❌ [Resend 테스트] 연결 실패:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return false;
  }
}

// 웰컴 이메일 전송 함수
async function sendWelcomeEmail(user, emailType = "welcome", retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 2000;

  try {
    let subject, html;

    switch (emailType) {
      case "welcome":
        subject = `[딜라이팅.AI] 환영합니다! ${user.displayName}님`;
        html = createWelcomeEmailTemplate(user);
        break;
      case "tip":
        subject = `[딜라이팅.AI] 글쓰기 팁 - ${user.displayName}님`;
        html = createTipEmailTemplate(user);
        break;
      case "sevenDayNotice":
        subject = `[딜라이팅.AI] 토큰 정책 변경 안내 - ${user.displayName}님`;
        html = createSevenDayNoticeTemplate(user);
        break;
      default:
        throw new Error(`알 수 없는 이메일 타입: ${emailType}`);
    }

    console.log(
      `📧 [Resend 웰컴 이메일] ${
        user.email
      }에게 ${emailType} 이메일 전송 시도 중... (시도 ${retryCount + 1}/${
        maxRetries + 1
      })`
    );

    const startTime = Date.now();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_USER,
      to: [user.email],
      subject: subject,
      html: html,
    });

    const duration = Date.now() - startTime;

    if (error) {
      throw new Error(`Resend API 에러: ${error.message}`);
    }

    console.log(
      `✅ [Resend 웰컴 이메일] 전송 성공: ${user.email} (${emailType}, ${duration}ms)`
    );
    console.log(`📧 [Resend 웰컴 이메일] 이메일 ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error(
      `❌ [Resend 웰컴 이메일] 전송 실패: ${user.email} (${emailType})`,
      error.message
    );

    if (retryCount < maxRetries) {
      console.log(
        `🔄 [Resend 웰컴 이메일] ${retryDelay}ms 후 재시도... (${
          retryCount + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return await sendWelcomeEmail(user, emailType, retryCount + 1);
    }

    throw error;
  }
}

// 웰컴 이메일 템플릿 생성
function createWelcomeEmailTemplate(user) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>딜라이팅.AI에 오신 것을 환영합니다!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">🎉 딜라이팅.AI에 오신 것을 환영합니다!</h1>
        <p style="font-size: 18px; color: #666;">${
          user.displayName
        }님, 가입해주셔서 감사합니다!</p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1e293b; margin-top: 0;">🚀 딜라이팅.AI란?</h2>
        <p>딜라이팅.AI는 AI 기반 글쓰기 피드백 서비스입니다. 여러분의 글을 분석하여 맞춤형 피드백을 제공하고, 더 나은 글쓰기 실력을 향상시켜드립니다.</p>
        <ul style="color: #475569;">
          <li><strong>AI 피드백:</strong> 문법, 구조, 내용 등 다각도 분석</li>
          <li><strong>맞춤형 조언:</strong> 개인별 글쓰기 스타일 고려</li>
          <li><strong>실시간 검토:</strong> 즉시 피드백 받기</li>
          <li><strong>성장 추적:</strong> 글쓰기 실력 향상 과정 모니터링</li>
        </ul>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #92400e; margin: 0 0 12px 0;">🎁 신규 사용자 특별 혜택 (7일 이내)</h3>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <h4 style="color: #92400e; margin: 0 0 8px 0;">📝 토큰 시스템</h4>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li><strong>300자 토큰:</strong> 매일 1개 지급 (짧은 글쓰기 연습용)</li>
            <li><strong>1000자 토큰:</strong> 매일 1개 지급 (긴 글쓰기 연습용)</li>
          </ul>
        </div>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px;">
          <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">
            ⚠️ 중요: 7일 후에는 토큰 정책이 변경됩니다!<br>
            • 300자 토큰: 주간 1개 지급<br>
            • 1000자 토큰: 주간 1개 지급
          </p>
        </div>
      </div>

      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0c4a6e; margin-top: 0;">💡 시작하기 가이드</h2>
        <ol style="color: #0c4a6e;">
          <li><strong>토큰 확인:</strong> 대시보드에서 현재 보유 토큰 확인</li>
          <li><strong>글 작성:</strong> 300자 또는 1000자 모드 선택</li>
          <li><strong>AI 분석:</strong> 글 작성 후 AI 피드백 요청</li>
          <li><strong>피드백 검토:</strong> 상세한 분석 결과 확인</li>
          <li><strong>개선하기:</strong> 피드백을 바탕으로 글 수정</li>
        </ol>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #166534; margin: 0 0 12px 0;">🌟 성공 팁</h3>
        <ul style="color: #166534; margin: 0; padding-left: 20px;">
          <li>매일 꾸준히 글쓰기 연습하기</li>
          <li>AI 피드백을 자세히 읽고 반영하기</li>
          <li>다양한 주제로 글쓰기 도전하기</li>
          <li>피드백 히스토리를 통해 성장 확인하기</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL || "https://your-domain.com"}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          지금 시작하기
        </a>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <h3 style="color: #1e293b; margin: 0 0 12px 0;">📞 지원 및 문의</h3>
        <p style="color: #64748b; margin: 0 0 8px 0;">궁금한 점이 있으시면 언제든 문의해주세요!</p>
        <a href="mailto:hello@digiocean.co.kr" style="color: #2563eb; font-weight: 600;">hello@digiocean.co.kr</a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>딜라이팅.AI와 함께 글쓰기 실력을 향상시켜보세요! 🚀</p>
        <p style="margin-top: 8px;">이 이메일은 딜라이팅.AI 서비스 가입 시 자동으로 발송됩니다.</p>
      </div>
    </body>
    </html>
  `;
}

// 팁 이메일 템플릿 생성
function createTipEmailTemplate(user) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>딜라이팅.AI 글쓰기 팁</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">💡 글쓰기 팁</h1>
        <p style="font-size: 18px; color: #666;">${
          user.displayName
        }님을 위한 특별한 팁!</p>
      </div>
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0c4a6e; margin-top: 0;">📝 효과적인 글쓰기 방법</h2>
        <ul style="color: #0c4a6e;">
          <li>명확한 주제와 목적을 설정하세요</li>
          <li>독자의 관점에서 생각해보세요</li>
          <li>구체적인 예시와 근거를 제시하세요</li>
          <li>간결하고 명확한 문장을 사용하세요</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL || "https://your-domain.com"}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          글쓰기 시작하기
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>궁금한 점이 있으시면 언제든 문의해주세요.</p>
        <a href="mailto:hello@digiocean.co.kr" style="color: #2563eb;">hello@digiocean.co.kr</a>
      </div>
    </body>
    </html>
  `;
}

// 7일 경과 안내 이메일 템플릿 생성
function createSevenDayNoticeTemplate(user) {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>딜라이팅.AI 토큰 정책 변경 안내</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc2626; margin-bottom: 10px;">📢 중요한 안내</h1>
        <p style="font-size: 18px; color: #666;">${
          user.displayName
        }님, 토큰 정책이 변경됩니다!</p>
      </div>
      
      <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #dc2626; margin-top: 0;">🔄 토큰 정책 변경</h2>
        <p style="color: #dc2626;">7일 신규 사용자 기간이 종료되어 토큰 정책이 변경됩니다.</p>
        <ul style="color: #dc2626; margin: 0; padding-left: 20px;">
          <li>300자 토큰: 주간 1개 지급</li>
          <li>1000자 토큰: 주간 1개 지급</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL || "https://your-domain.com"}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          플랫폼에서 확인하기
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>궁금한 점이 있으시면 언제든 문의해주세요.</p>
        <a href="mailto:hello@digiocean.co.kr" style="color: #2563eb;">hello@digiocean.co.kr</a>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendFeedbackEmail,
  sendWelcomeEmail,
  validateResendConfig,
  testResendConnection,
};
