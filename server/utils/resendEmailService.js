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

module.exports = {
  sendFeedbackEmail,
  validateResendConfig,
  testResendConnection,
};
