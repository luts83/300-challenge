// server/controllers/userController.js

const { ACCESS_CONTROL } = require("../config");
const fetchAllowedEmailsFromSheet = require("../utils/fetchAllowedEmails");

// 캐싱을 위한 변수
let allowedEmailsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

// 비화이트리스트 유저 활동 로깅 함수
function logNonWhitelistedUserActivity(activity, userInfo) {
  const timestamp = new Date().toISOString();
  console.log(`🚨 [비화이트리스트 유저 활동 감지] ${timestamp}`);
  console.log(`📧 이메일: ${userInfo.email}`);
  console.log(`👤 사용자명: ${userInfo.displayName || "N/A"}`);
  console.log(`🆔 UID: ${userInfo.uid}`);
  console.log(`🎯 활동: ${activity}`);
  console.log(`⏰ 시간: ${timestamp}`);
  console.log("─".repeat(80));
}

async function checkEmailAccess(email) {
  const now = Date.now();

  // 캐시가 유효한지 확인
  if (
    allowedEmailsCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    const isAllowed = allowedEmailsCache.includes(email);
    // 캐시 히트 시에는 로그 출력하지 않음
    return isAllowed;
  }

  console.log(" checkEmailAccess 호출됨 (캐시 미스)");
  console.log("📧 체크할 이메일:", email);

  try {
    // 실시간으로 구글시트에서 허용된 이메일 목록 가져오기
    const allowedEmails = await fetchAllowedEmailsFromSheet();

    if (!ACCESS_CONTROL.ENABLED) {
      return true;
    }

    const isAllowed = allowedEmails.includes(email);

    // 캐시 업데이트
    allowedEmailsCache = allowedEmails;
    cacheTimestamp = now;

    console.log("✅ 이메일 접근 권한 확인 완료:", {
      이메일: email,
      허용여부: isAllowed,
      허용된이메일수: allowedEmails.length,
    });
    return isAllowed;
  } catch (error) {
    console.error("❌ 이메일 접근 권한 확인 실패:", error);
    return false;
  }
}

// 비화이트리스트 유저 활동 감지 함수
async function detectNonWhitelistedUserActivity(activity, userInfo) {
  const isWhitelisted = await checkEmailAccess(userInfo.email);

  if (!isWhitelisted) {
    logNonWhitelistedUserActivity(activity, userInfo);
  }

  return isWhitelisted;
}

module.exports = {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
  logNonWhitelistedUserActivity,
};
