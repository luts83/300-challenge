// server/routes/token.js
const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
const WritingStreak = require("../models/WritingStreak");
const { TOKEN } = require("../config");
const admin = require("firebase-admin");
const {
  checkEmailAccess,
  detectNonWhitelistedUserActivity,
} = require("../controllers/userController");

// 디버그 로그 캐시 (유저별로 한 번만 출력)
const debugLogCache = new Set();

// 로그 중복 방지 함수 (10분 내 동일 작업은 한 번만 로깅)
function shouldLog(uid, action, minutes = 10) {
  const key = `${uid}_${action}_${new Date().toISOString().slice(0, 10)}`;
  const now = Date.now();

  if (!debugLogCache.has(key)) {
    debugLogCache.add(key);
    return true;
  }

  // 캐시에서 마지막 로깅 시간 확인 (Set이므로 Map으로 변경 필요)
  // 간단한 구현을 위해 Set을 Map으로 변경
  return false;
}

// 로그 중복 방지 함수 (Map 기반, 10분 내 동일 작업은 한 번만 로깅)
const logCache = new Map();
function shouldLogWithTime(uid, action, minutes = 10) {
  const key = `${uid}_${action}_${new Date().toISOString().slice(0, 10)}`;
  const now = Date.now();

  if (!logCache.has(key)) {
    logCache.set(key, now);
    return true;
  }

  const lastLogTime = logCache.get(key);
  if (now - lastLogTime > minutes * 60 * 1000) {
    logCache.set(key, now);
    return true;
  }

  return false;
}

// 캐시 크기 제한 (메모리 누수 방지)
function cleanupLogCache() {
  if (logCache.size > 1000) {
    logCache.clear();
  }
}

/**
 * UTC 오프셋을 기반으로 대략적인 위치 정보를 반환
 * @param {number} offsetHours - UTC 기준 시간 차이 (시간 단위)
 * @returns {string} 위치 정보
 */
const getLocationByOffset = (offsetHours) => {
  const locationMap = {
    "-12": "🇺🇸 하와이",
    "-11": "🇺🇸 알래스카",
    "-10": "🇺🇸 하와이",
    "-9": "🇺🇸 알래스카",
    "-8": "🇺🇸 로스앤젤레스",
    "-7": "🇺🇸 덴버",
    "-6": "🇺🇸 시카고",
    "-5": "🇺🇸 뉴욕",
    "-4": "🇺🇸 뉴욕 (서머타임)",
    "-3": "🇧🇷 상파울루",
    "-2": "🇧🇷 상파울루 (서머타임)",
    "-1": "🇵🇹 아조레스",
    0: "🇬🇧 런던",
    1: "🇬🇧 런던 (서머타임) / 🇫🇷 파리 / 🇩🇪 베를린",
    2: "🇺🇦 키예프 / 🇹🇷 이스탄불",
    3: "🇷🇺 모스크바",
    4: "🇷🇺 모스크바 (서머타임)",
    5: "🇮🇳 뭄바이",
    5.5: "🇮🇳 뭄바이",
    6: "🇰🇿 알마티",
    7: "🇹🇭 방콕",
    8: "🇨🇳 베이징 / 🇭🇰 홍콩",
    9: "🇰🇷 서울 / 🇯🇵 도쿄",
    10: "🇦🇺 시드니",
    11: "🇦🇺 시드니 (서머타임)",
    12: "🇳🇿 오클랜드",
    13: "🇳🇿 오클랜드 (서머타임)",
  };

  // 가장 가까운 오프셋 찾기
  const closestOffset = Object.keys(locationMap).reduce((prev, curr) => {
    return Math.abs(curr - offsetHours) < Math.abs(prev - offsetHours)
      ? curr
      : prev;
  });

  return locationMap[closestOffset] || `알 수 없는 지역`;
};

// ✍ UID로 해당 유저의 토큰 조회 (mode별)
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  // 사용자 시간대 정보 파싱
  const timezone = req.query.timezone || "Asia/Seoul";
  const offset = parseInt(req.query.offset) || -540; // 기본값: 한국 시간 (getTimezoneOffset 값)

  try {
    // Firebase에서 사용자 정보 조회
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (firebaseError) {
      console.error(`❌ Firebase 사용자 조회 실패 (UID: ${uid}):`, {
        error: firebaseError.message,
        code: firebaseError.code,
        uid: uid,
      });

      // Firebase에서 사용자를 찾을 수 없는 경우
      if (firebaseError.code === "auth/user-not-found") {
        return res.status(404).json({
          error: "사용자를 찾을 수 없습니다.",
          message:
            "Firebase에서 해당 사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.",
          code: "USER_NOT_FOUND",
        });
      }

      // 기타 Firebase 오류
      return res.status(500).json({
        error: "Firebase 인증 오류",
        message: "사용자 인증에 문제가 발생했습니다.",
        code: "FIREBASE_ERROR",
      });
    }

    // 디버깅: 유저 로컬타임 출력 (토큰 조회 시) - 10분 내 중복 방지
    if (shouldLogWithTime(uid, "token_query", 10)) {
      const userLocalTime = new Date();
      const userLocalTimeAdjusted = new Date(
        userLocalTime.getTime() - offset * 60 * 1000
      );

      console.log(`[토큰 조회] ${userRecord.email} 유저 로컬타임:`, {
        userTime: userLocalTimeAdjusted.toISOString(),
        timezone: timezone,
      });
    }

    // Token 모델에서 토큰 정보 조회
    const tokenEntry = await Token.findOne({ uid });

    const now = new Date();

    // 새로운 시간대 유틸리티 사용
    const {
      getUserTodayDateString,
      getUserTodayDate,
      getUserMonday,
      logTimezoneInfo,
    } = require("../utils/timezoneUtils");

    const today = getUserTodayDateString(offset);
    const monday = getUserMonday(offset);

    // 간략화된 시간대 디버깅 (유저별 하루 한 번만)
    const timezoneDebugKey = `${uid}_timezone_${today}`;
    if (
      process.env.NODE_ENV === "development" &&
      !debugLogCache.has(timezoneDebugKey)
    ) {
      logTimezoneInfo(userRecord.email, timezone, offset);
      debugLogCache.add(timezoneDebugKey);
    }

    // 주간 리셋 디버깅 로그 추가
    if (process.env.NODE_ENV === "development") {
      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      const userTime = new Date(now.getTime() - offset * 60 * 1000);
      const dayOfWeek = userTime.getDay();

      console.log(`[주간리셋 디버그] ${userRecord.email}:`);
      console.log(`  - 서버시간: ${now.toISOString()}`);
      console.log(`  - 사용자시간: ${userTime.toISOString()}`);
      console.log(`  - 사용자요일: ${weekdays[dayOfWeek]} (${dayOfWeek})`);
      console.log(`  - 계산된월요일: ${monday.toISOString()}`);
      console.log(
        `  - 월요일계산방식: ${
          dayOfWeek === 0 ? "일요일→이전주월요일" : "월~토→이번주월요일"
        }`
      );
      if (finalTokenEntry?.lastWeeklyRefreshed) {
        console.log(
          `  - 마지막주간리셋: ${finalTokenEntry.lastWeeklyRefreshed.toISOString()}`
        );
        console.log(
          `  - 리셋필요: ${finalTokenEntry.lastWeeklyRefreshed < monday}`
        );
      }
    }

    // 간략화된 토큰 디버깅 (유저별 하루 한 번만)
    const tokenDebugKey = `${uid}_token_${today}`;
    if (
      process.env.NODE_ENV === "development" &&
      !debugLogCache.has(tokenDebugKey)
    ) {
      console.log(`[토큰] ${userRecord.email}: ${today} 기준`);
      debugLogCache.add(tokenDebugKey);
    }

    // 캐시 크기 제한 (메모리 누수 방지)
    if (debugLogCache.size > 1000) {
      debugLogCache.clear();
    }

    // 로그 캐시 정리
    cleanupLogCache();

    let finalTokenEntry = tokenEntry;
    if (!finalTokenEntry) {
      finalTokenEntry = new Token({
        uid,
        user: {
          email: userRecord.email,
          displayName: userRecord.displayName || userRecord.email.split("@")[0],
        },
        tokens_300: TOKEN.DAILY_LIMIT_300,
        tokens_1000: TOKEN.WEEKLY_LIMIT_1000,
        goldenKeys: 0,
        lastRefreshed: now,
        lastWeeklyRefreshed: monday,
      });
    } else {
      // 기존 토큰의 사용자 정보 업데이트
      finalTokenEntry.user = {
        email: userRecord.email,
        displayName: userRecord.displayName || userRecord.email.split("@")[0],
      };
    }

    // 간략화된 토큰 상태 디버깅 (유저별 하루 한 번만)
    const tokenStatusDebugKey = `${uid}_status_${today}`;
    if (
      process.env.NODE_ENV === "development" &&
      !debugLogCache.has(tokenStatusDebugKey)
    ) {
      const lastRefreshed =
        finalTokenEntry?.lastRefreshed?.toISOString().split("T")[0] || "N/A";
      console.log(
        `[토큰상태] ${
          userRecord.email
        }: 마지막리프레시=${lastRefreshed}, 리프레시필요=${
          finalTokenEntry?.lastRefreshed < new Date(today + "T00:00:00.000Z")
        }`
      );
      debugLogCache.add(tokenStatusDebugKey);
    }

    // 화이트리스트 체크
    const isWhitelisted = await checkEmailAccess(userRecord.email);

    // 비화이트리스트 유저 활동 로깅
    await detectNonWhitelistedUserActivity("토큰 조회", {
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email.split("@")[0],
      uid: uid,
    });

    // 가입일 기반 분기 추가
    let daysSinceJoin = 9999;
    let userDoc = null;
    if (!isWhitelisted) {
      userDoc = await Token.db.collection("users").findOne({ uid });
      if (userDoc && userDoc.createdAt) {
        daysSinceJoin = Math.floor(
          (now - new Date(userDoc.createdAt)) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // 간략화된 유저 정보 로그 (유저별 하루 한 번만)
    const userInfoDebugKey = `${uid}_userinfo_${today}`;
    if (
      process.env.NODE_ENV === "development" &&
      !debugLogCache.has(userInfoDebugKey)
    ) {
      const lastRefreshed =
        finalTokenEntry?.lastRefreshed?.toISOString().split("T")[0] || "N/A";
      const lastWeeklyRefreshed =
        finalTokenEntry?.lastWeeklyRefreshed?.toISOString().split("T")[0] ||
        "N/A";
      console.log(
        `[유저] ${userRecord.email}: 화이트리스트=${isWhitelisted}, 가입후=${daysSinceJoin}일, 마지막리프레시=${lastRefreshed}, 주간리프레시=${lastWeeklyRefreshed}`
      );
      debugLogCache.add(userInfoDebugKey);
    }

    // 300자 토큰 지급 (submitController.js와 동일한 분기 및 디버깅)
    if (isWhitelisted) {
      // 매일 리셋 - 사용자 시간대 기준으로 간단한 비교
      const lastRefreshedDate = new Date(finalTokenEntry.lastRefreshed);

      // 사용자 시간대 기준으로 마지막 리프레시 날짜 계산
      const lastRefreshedUserDate = new Date(
        lastRefreshedDate.getTime() - offset * 60 * 1000
      );
      const lastRefreshedUserDay = lastRefreshedUserDate
        .toISOString()
        .slice(0, 10);

      // 오늘 날짜 (이미 사용자 시간대 기준으로 계산됨)
      const todayStr = today;

      // 날짜 비교 전 추가 검증
      const now = new Date();
      const currentUserTime = new Date(now.getTime() - offset * 60 * 1000);
      const currentUserDay = currentUserTime.toISOString().slice(0, 10);

      const refreshDebugKey = `${uid}_refresh_${today}`;
      if (
        process.env.NODE_ENV === "development" &&
        !debugLogCache.has(refreshDebugKey)
      ) {
        console.log(
          `[리프레시] ${
            userRecord.email
          }: ${lastRefreshedUserDay} → ${todayStr} (필요: ${
            lastRefreshedUserDay < todayStr
          })`
        );
        console.log(`[리프레시 상세]`, {
          lastRefreshedDate: finalTokenEntry.lastRefreshed.toISOString(),
          lastRefreshedUserDate: lastRefreshedUserDate.toISOString(),
          lastRefreshedUserDay,
          todayStr,
          currentUserDay,
          offset,
          serverTime: now.toISOString(),
          userTime: currentUserTime.toISOString(),
          comparison: `${lastRefreshedUserDay} < ${todayStr} = ${
            lastRefreshedUserDay < todayStr
          }`,
          validation: `todayStr === currentUserDay: ${
            todayStr === currentUserDay
          }`,
        });
        debugLogCache.add(refreshDebugKey);
      }

      // 날짜 비교 전 검증: todayStr이 현재 사용자 시간과 일치하는지 확인
      if (todayStr !== currentUserDay) {
        console.warn(`[경고] 날짜 불일치: ${userRecord.email}`, {
          todayStr,
          currentUserDay,
          offset,
          serverTime: now.toISOString(),
        });
      }

      // 토큰 지급 조건 검사 전 추가 검증
      const shouldRefresh = lastRefreshedUserDay < todayStr;
      const timeSinceLastRefresh =
        now.getTime() - finalTokenEntry.lastRefreshed.getTime();
      const hoursSinceLastRefresh = timeSinceLastRefresh / (1000 * 60 * 60);

      if (process.env.NODE_ENV === "development") {
        console.log(`[토큰검증] ${userRecord.email}:`, {
          shouldRefresh,
          timeSinceLastRefresh: `${hoursSinceLastRefresh.toFixed(2)}시간`,
          lastRefreshedUserDay,
          todayStr,
          currentUserDay,
          condition: `${lastRefreshedUserDay} < ${todayStr} = ${shouldRefresh}`,
        });
      }

      if (shouldRefresh) {
        // 추가 안전장치: 마지막 리프레시로부터 최소 12시간이 지났는지 확인
        if (hoursSinceLastRefresh < 12) {
          console.warn(`[경고] 의심스러운 토큰 리프레시: ${userRecord.email}`, {
            hoursSinceLastRefresh: hoursSinceLastRefresh.toFixed(2),
            lastRefreshed: finalTokenEntry.lastRefreshed.toISOString(),
            currentTime: now.toISOString(),
            reason: "마지막 리프레시로부터 12시간 미만",
          });
        }

        finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
        finalTokenEntry.lastRefreshed = now;
        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
        if (shouldLogWithTime(uid, "token_grant_300", 10)) {
          console.log(
            `[토큰지급] ${
              userRecord.email
            }: 300자 일일리셋 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
          );
        }
      } else {
        // 스킵 로그는 토큰이 0개일 때만 출력하고, 중복 방지
        if (finalTokenEntry.tokens_300 === 0) {
          const logKey = `token_skip_${userRecord.uid}_${today}`;
          if (!debugLogCache.has(logKey)) {
            // 사용자 시간대 기준으로 현재 시간 계산
            const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
            console.log(
              `[토큰스킵] ${
                userRecord.email
              }: 아직 리프레시 시간이 아님 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
            );

            debugLogCache.add(logKey);

            // 캐시 크기 제한 (메모리 누수 방지)
            if (debugLogCache.size > 1000) {
              const firstKey = debugLogCache.values().next().value;
              debugLogCache.delete(firstKey);
            }
          }
        }
      }
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 매일 지급
      const lastRefreshedDate = new Date(finalTokenEntry.lastRefreshed);

      // 사용자 시간대 기준으로 마지막 리프레시 날짜 계산
      const lastRefreshedUserDate = new Date(
        lastRefreshedDate.getTime() - offset * 60 * 1000
      );
      const lastRefreshedUserDay = lastRefreshedUserDate
        .toISOString()
        .slice(0, 10);

      // 오늘 날짜 (이미 사용자 시간대 기준으로 계산됨)
      const todayStr = today;

      if (lastRefreshedUserDay < todayStr) {
        finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
        finalTokenEntry.lastRefreshed = now;
        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
        if (shouldLogWithTime(uid, "token_grant_300_new", 10)) {
          console.log(
            `[토큰지급] ${
              userRecord.email
            }: 300자 신규유저 일일리셋 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
          );
        }
      }
    } else {
      // 비참여자, 가입 7일 이후: 주간 지급
      // 사용자 시간대 기준으로 월요일 계산 (이미 위에서 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        // 300자와 1000자 토큰을 동시에 충전
        finalTokenEntry.tokens_300 = TOKEN.WEEKLY_LIMIT_300;
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
        if (shouldLogWithTime(uid, "token_grant_weekly", 10)) {
          console.log(
            `[토큰지급] ${
              userRecord.email
            }: 300자+1000자 주간리셋 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
          );
        }
      }
    }

    // 1000자 토큰 지급 로직 (화이트리스트 유저와 신규 유저용)
    if (isWhitelisted) {
      // 화이트리스트 유저: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
        if (shouldLogWithTime(uid, "token_grant_1000", 10)) {
          console.log(
            `[토큰지급] ${
              userRecord.email
            }: 1000자 주간리셋 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
          );
        }
      }
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        // 사용자 시간대 기준으로 현재 시간 계산
        const userNow = new Date(new Date().getTime() - offset * 60 * 1000);
        if (shouldLogWithTime(uid, "token_grant_1000_new", 10)) {
          console.log(
            `[토큰지급] ${
              userRecord.email
            }: 1000자 신규유저 주간리셋 (userTime: ${userNow.toISOString()}, timezone: ${timezone})`
          );
        }
      }
    }
    // 비참여자, 가입 7일 이후는 위에서 이미 처리됨

    // 다음 리프레시 예정일 계산
    let nextRefreshDate = null;
    if (isWhitelisted || daysSinceJoin < 7) {
      // 사용자 로컬 자정(내일 00:00 로컬)의 실제 UTC 시간
      const [y, m, d] = today.split("-").map(Number);
      const nextLocalMidnightUtcMs =
        Date.UTC(y, m - 1, d + 1, 0, 0, 0) + offset * 60 * 1000;
      nextRefreshDate = new Date(nextLocalMidnightUtcMs).toISOString();
    } else {
      // 다음 주 월요일 00:00(로컬)의 실제 UTC 시간
      const nextMondayUtcMs =
        monday.getTime() + 7 * 24 * 60 * 60 * 1000 + offset * 60 * 1000;
      nextRefreshDate = new Date(nextMondayUtcMs).toISOString();
    }

    await finalTokenEntry.save();

    res.json({
      tokens_300: finalTokenEntry.tokens_300,
      tokens_1000: finalTokenEntry.tokens_1000,
      goldenKeys: finalTokenEntry.goldenKeys,
      lastRefreshed: finalTokenEntry.lastRefreshed,
      lastWeeklyRefreshed: finalTokenEntry.lastWeeklyRefreshed,
      user: finalTokenEntry.user,
      isWhitelisted,
      daysSinceJoin: isWhitelisted ? null : daysSinceJoin,
      nextRefreshDate,
    });
  } catch (error) {
    console.error("[토큰 지급][에러]", error);
    res.status(500).json({ error: "토큰 지급 중 오류 발생" });
  }
});

// ✍ UID로 해당 유저의 토큰 히스토리 조회
router.get("/history/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const history = await UserTokenHistory.findOne({ uid });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "토큰 히스토리 조회 실패" });
  }
});

module.exports = router;
