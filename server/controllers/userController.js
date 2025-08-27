// server/controllers/userController.js

const { ACCESS_CONTROL } = require("../config");
const fetchAllowedEmailsFromSheet = require("../utils/fetchAllowedEmails");

// 캐싱을 위한 변수
let allowedEmailsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

// 비화이트리스트 토큰 조회 로그 캐싱 (하루에 한 번만 출력)
const tokenQueryLogCache = new Set();

// 비화이트리스트 유저 활동 로깅 함수
function logNonWhitelistedUserActivity(activity, userInfo) {
  const timestamp = new Date().toISOString();

  // 토큰 조회는 과도한 로깅 방지를 위해 캐싱 적용
  if (activity === "토큰 조회") {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${userInfo.uid}_token_query_${today}`;

    if (!tokenQueryLogCache.has(cacheKey)) {
      console.log(
        `🚨 [비화이트리스트 토큰 조회] ${userInfo.email} (${userInfo.uid})`
      );
      tokenQueryLogCache.add(cacheKey);

      // 캐시 크기 제한 (메모리 누수 방지)
      if (tokenQueryLogCache.size > 1000) {
        tokenQueryLogCache.clear();
      }
    }
  } else {
    const localTime = new Date();
    console.log(`🚨 [비화이트리스트 유저 활동 감지] ${localTime}`);
    console.log(`📧 이메일: ${userInfo.email}`);
    console.log(`👤 사용자명: ${userInfo.displayName || "N/A"}`);
    console.log(`🆔 UID: ${userInfo.uid}`);
    console.log(`🎯 활동: ${activity}`);
    console.log(`⏰ 시간: ${localTime}`);
    console.log("─".repeat(80));
  }
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

  // 캐시 미스 시에도 로그 출력하지 않음 (서버 시작 시에만 로그 출력)
  try {
    // 실시간으로 구글시트에서 허용된 이메일 목록 가져오기
    const allowedEmails = await fetchAllowedEmailsFromSheet();

    if (!ACCESS_CONTROL.ENABLED) {
      return true;
    }

    const isAllowed = allowedEmails.includes(email);

    // 캐시가 처음 생성되는지 확인
    const isFirstCache = !allowedEmailsCache;

    // 캐시 업데이트
    allowedEmailsCache = allowedEmails;
    cacheTimestamp = now;

    // 서버 시작/재시작 시에만 로그 출력 (캐시가 처음 생성될 때)
    if (isFirstCache) {
      console.log("✅ 허용된 이메일 목록 로딩 완료:", {
        허용된이메일수: allowedEmails.length,
      });
    }

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
