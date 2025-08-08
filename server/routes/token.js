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

// ✍ UID로 해당 유저의 토큰 조회 (mode별)
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;

  // 사용자 시간대 정보 파싱
  const timezone = req.query.timezone || "Asia/Seoul";
  const offset = parseInt(req.query.offset) || -540; // 기본값: 한국 시간

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

    // Token 모델에서 토큰 정보 조회
    const tokenEntry = await Token.findOne({ uid });

    const now = new Date();

    // 사용자 시간대 기준으로 오늘 날짜 계산 (수정된 로직)
    const userTime = new Date(now.getTime() + offset * 60 * 1000);
    const today = new Date(
      Date.UTC(
        userTime.getUTCFullYear(),
        userTime.getUTCMonth(),
        userTime.getUTCDate()
      )
    );

    // 디버깅을 위한 시간 정보 (finalTokenEntry 정의 후로 이동)

    // 사용자 시간대 기준으로 월요일 계산
    const userMonday = new Date(userTime);
    const dayOfWeek = userMonday.getUTCDay(); // 0=일요일, 1=월요일, ...
    const monday = new Date(
      Date.UTC(
        userMonday.getUTCFullYear(),
        userMonday.getUTCMonth(),
        userMonday.getUTCDate() - dayOfWeek + 1
      )
    );

    // 디버깅: 시간 정보는 개발 환경에서만 출력 (유저별)
    const debugKey = `${uid}_${today.toISOString().split("T")[0]}`;
    if (
      process.env.NODE_ENV === "development" &&
      !debugLogCache.has(debugKey)
    ) {
      console.log(`[토큰 지급 디버그] ${userRecord.email} (${uid})`);
      console.log("now:", now.toISOString());
      console.log("today (0시):", today.toISOString());
      console.log("monday (이번주 월요일 0시):", monday.toISOString());
      debugLogCache.add(debugKey);

      // 캐시 크기 제한 (메모리 누수 방지)
      if (debugLogCache.size > 1000) {
        debugLogCache.clear();
      }
    }

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

    // 디버깅을 위한 시간 정보 (변화가 있을 때만 출력)
    const timeDebugKey = `${uid}_timedebug_${
      today.toISOString().split("T")[0]
    }`;
    if (!debugLogCache.has(timeDebugKey)) {
      console.log(`[토큰 디버그] ${userRecord.email}:`);
      console.log(`  - offset: ${offset}분`);
      console.log(`  - now: ${now.toISOString()}`);
      console.log(`  - userTime: ${userTime.toISOString()}`);
      console.log(`  - today: ${today.toISOString()}`);
      console.log(
        `  - lastRefreshed: ${
          finalTokenEntry?.lastRefreshed?.toISOString() || "N/A"
        }`
      );
      console.log(`  - 비교 결과: ${finalTokenEntry?.lastRefreshed < today}`);
      debugLogCache.add(timeDebugKey);
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

    // 유저 정보 로그는 한 번만 출력
    if (
      !debugLogCache.has(`${uid}_userinfo_${today.toISOString().split("T")[0]}`)
    ) {
      console.log(
        `[토큰 지급][토큰조회] 유저: ${userRecord.email} (${uid}) / 화이트리스트: ${isWhitelisted} / 가입 후 ${daysSinceJoin}일 경과`
      );
      if (finalTokenEntry) {
        console.log(
          "lastRefreshed:",
          finalTokenEntry.lastRefreshed?.toISOString?.() ||
            finalTokenEntry.lastRefreshed
        );
        console.log(
          "lastWeeklyRefreshed:",
          finalTokenEntry.lastWeeklyRefreshed?.toISOString?.() ||
            finalTokenEntry.lastWeeklyRefreshed
        );
      }
      debugLogCache.add(`${uid}_userinfo_${today.toISOString().split("T")[0]}`);
    }

    // 300자 토큰 지급 (submitController.js와 동일한 분기 및 디버깅)
    if (isWhitelisted) {
      // 매일 리셋 - 더 명확한 조건
      const lastRefreshedDate = new Date(finalTokenEntry.lastRefreshed);
      const lastRefreshedDay = new Date(
        Date.UTC(
          lastRefreshedDate.getUTCFullYear(),
          lastRefreshedDate.getUTCMonth(),
          lastRefreshedDate.getUTCDate()
        )
      );

      const refreshDebugKey = `${uid}_refresh_${
        today.toISOString().split("T")[0]
      }`;
      if (!debugLogCache.has(refreshDebugKey)) {
        console.log(`[토큰 리프레시 체크] ${userRecord.email}:`);
        console.log(`  - lastRefreshedDay: ${lastRefreshedDay.toISOString()}`);
        console.log(`  - today: ${today.toISOString()}`);
        console.log(`  - 리프레시 필요: ${lastRefreshedDay < today}`);
        debugLogCache.add(refreshDebugKey);
      }

      if (lastRefreshedDay < today) {
        finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
        finalTokenEntry.lastRefreshed = now;
        console.log(
          `[토큰 지급][토큰조회] 화이트리스트 유저에게 300자 토큰 지급 (일일 리셋)`
        );
      } else {
        // 스킵 로그는 토큰이 0개일 때만 출력
        if (finalTokenEntry.tokens_300 === 0) {
          console.log(
            `[토큰 리프레시 스킵] ${userRecord.email}: 아직 리프레시 시간이 아님 (토큰: 0개)`
          );
        }
      }
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 매일 지급
      if (finalTokenEntry.lastRefreshed < today) {
        finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
        finalTokenEntry.lastRefreshed = now;
        console.log(
          `[토큰 지급][토큰조회] 신규 비참여자(가입 7일 이내)에게 300자 토큰 지급 (일일 리셋)`
        );
      }
    } else {
      // 비참여자, 가입 7일 이후: 주간 지급
      // 사용자 시간대 기준으로 월요일 계산 (이미 위에서 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        // 300자와 1000자 토큰을 동시에 충전
        finalTokenEntry.tokens_300 = TOKEN.WEEKLY_LIMIT_300;
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        console.log(
          `[토큰 지급][토큰조회] 비화이트리스트 유저(가입 7일 초과)에게 300자, 1000자 토큰 지급 (주간 리셋)`
        );
      }
    }

    // 1000자 토큰 지급 로직 (화이트리스트 유저와 신규 유저용)
    if (isWhitelisted) {
      // 화이트리스트 유저: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        console.log(
          `[토큰 지급][토큰조회] 화이트리스트 유저에게 1000자 토큰 지급 (주간 리셋)`
        );
      }
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 주간 지급 (사용자 시간대 기준으로 이미 계산된 monday 사용)

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        console.log(
          `[토큰 지급][토큰조회] 신규 비참여자(가입 7일 이내)에게 1000자 토큰 지급 (주간 리셋)`
        );
      }
    }
    // 비참여자, 가입 7일 이후는 위에서 이미 처리됨

    // 다음 리프레시 예정일 계산
    let nextRefreshDate = null;
    if (isWhitelisted || daysSinceJoin < 7) {
      // 내일 0시
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      nextRefreshDate = tomorrow.toISOString();
    } else {
      // 다음주 월요일 0시
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      nextRefreshDate = nextMonday.toISOString();
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
