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

  try {
    // Firebase에서 사용자 정보 조회
    const userRecord = await admin.auth().getUser(uid);

    // Token 모델에서 토큰 정보 조회
    const tokenEntry = await Token.findOne({ uid });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    // 디버깅: 시간 정보는 한 번만 출력 (유저별)
    const debugKey = `${uid}_${today.toISOString().split("T")[0]}`;
    if (!debugLogCache.has(debugKey)) {
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
      // 매일 리셋
      if (finalTokenEntry.lastRefreshed < today) {
        finalTokenEntry.tokens_300 = TOKEN.DAILY_LIMIT_300;
        finalTokenEntry.lastRefreshed = now;
        console.log(
          `[토큰 지급][토큰조회] 화이트리스트 유저에게 300자 토큰 지급 (일일 리셋)`
        );
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
      // UTC 기준으로 월요일 0시 계산 (lastWeeklyRefreshed와 동일한 기준)
      const monday = new Date(now);
      const dayOfWeek = monday.getUTCDay(); // 0=일요일, 1=월요일, ...
      const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 월요일까지 남은 일수
      monday.setUTCDate(monday.getUTCDate() - dayOfWeek + 1); // 이번 주 월요일로 설정
      monday.setUTCHours(0, 0, 0, 0); // UTC 0시로 설정

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
      // 화이트리스트 유저: 주간 지급
      const monday = new Date(now);
      const dayOfWeek = monday.getUTCDay();
      monday.setUTCDate(monday.getUTCDate() - dayOfWeek + 1);
      monday.setUTCHours(0, 0, 0, 0);

      if (finalTokenEntry.lastWeeklyRefreshed < monday) {
        finalTokenEntry.tokens_1000 = TOKEN.WEEKLY_LIMIT_1000;
        finalTokenEntry.lastWeeklyRefreshed = monday;
        console.log(
          `[토큰 지급][토큰조회] 화이트리스트 유저에게 1000자 토큰 지급 (주간 리셋)`
        );
      }
    } else if (daysSinceJoin < 7) {
      // 비참여자, 가입 후 7일 이내: 주간 지급
      const monday = new Date(now);
      const dayOfWeek = monday.getUTCDay();
      monday.setUTCDate(monday.getUTCDate() - dayOfWeek + 1);
      monday.setUTCHours(0, 0, 0, 0);

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
