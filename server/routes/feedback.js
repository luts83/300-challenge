// routes/feedback.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const mongoose = require("mongoose");
const config = require("../config");
const { submitFeedback } = require("../controllers/feedbackController");
const WritingStreak = require("../models/WritingStreak");
const Token = require("../models/Token");
const { handleTokenChange } = require("../utils/tokenHistory");
const HelpfulVote = require("../models/HelpfulVote");
const {
  getUserTodayDate,
  getTodayDateKorea,
  getTodayDateKoreaSimple,
  getTodayDateKoreaFinal,
} = require("../utils/timezoneUtils");
const { authenticateToken } = require("../middleware/auth");

// 로그 중복 방지 함수 (10분 내 동일 작업은 한 번만 로깅)
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

// 변화 감지 기반 로깅: 동일 날짜/스코프에서 집계치가 변하면 즉시 로깅
const lastCountCache = new Map();
function shouldLogOnChange(scopeKey, current) {
  const prev = lastCountCache.get(scopeKey);
  const changed =
    !prev ||
    prev.mode300 !== current.mode300 ||
    prev.mode1000 !== current.mode1000 ||
    prev.total !== current.total;

  if (changed) {
    lastCountCache.set(scopeKey, { ...current });
    // 캐시 크기 관리
    if (lastCountCache.size > 1000) {
      lastCountCache.clear();
    }
  }
  return changed;
}

// 모든 feedback 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 피드백할 글 추천 (모드 동일 + 적게 받은 글 우선)
router.get("/assignments/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    // 한국 시간 기준으로 오늘 날짜 계산 (일관된 방식)
    const today = getTodayDateKoreaFinal(); // YYYY-MM-DD

    // 오늘 내가 쓴 글 중 가장 최근 글 확인
    const todaySubmission = await Submission.findOne({
      "user.uid": uid,
      submissionDate: today,
    }).sort({ createdAt: -1 });

    if (!todaySubmission) {
      return res.status(404).json({
        message: "오늘 작성한 글이 없어 피드백 대상이 없습니다.",
      });
    }

    const myMode = todaySubmission.mode;

    // 이미 피드백한 글 ID 목록 (전체 기간 기준으로 중복 방지)
    const givenFeedbacks = await Feedback.find({
      fromUid: uid,
      // 전체 기간 동안 이미 피드백한 글을 모두 제외
    }).select("toSubmissionId");

    const givenIds = givenFeedbacks
      .map((fb) => {
        try {
          return mongoose.Types.ObjectId.isValid(fb.toSubmissionId)
            ? fb.toSubmissionId.toString()
            : null;
        } catch (err) {
          console.error("Invalid toSubmissionId:", fb);
          return null;
        }
      })
      .filter((id) => id !== null);

    // 피드백 대상 후보 찾기
    let candidateQuery = {
      "user.uid": { $ne: uid },
      _id: { $nin: givenIds },
      isDeleted: { $ne: true }, // 삭제된 글 제외
    };

    // 교차 피드백 설정에 따라 모드 조건 추가
    if (config.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
      const allowedModes =
        config.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[myMode];
      candidateQuery.mode = { $in: allowedModes };
    } else {
      candidateQuery.mode = myMode;
    }

    const candidates = await Submission.find(candidateQuery).sort({
      createdAt: -1,
    });

    // 가중치 계산 및 적용
    const weightedCandidates = candidates.map((submission) => {
      const daysDiff = Math.floor(
        (new Date() - new Date(submission.createdAt)) / (1000 * 60 * 60 * 24)
      );
      return {
        submission,
        weight: 1 / (daysDiff + 1),
      };
    });

    // 가중치 기반 랜덤 선택
    const selectedMissions = [];
    const targetCount = Math.min(
      config.FEEDBACK.PER_SUBMISSION,
      weightedCandidates.length
    );

    while (
      selectedMissions.length < targetCount &&
      weightedCandidates.length > 0
    ) {
      const totalWeight = weightedCandidates.reduce(
        (sum, item) => sum + item.weight,
        0
      );
      const random = Math.random() * totalWeight;

      let accumWeight = 0;
      const selectedIndex = weightedCandidates.findIndex((item) => {
        accumWeight += item.weight;
        return accumWeight >= random;
      });

      if (selectedIndex !== -1) {
        selectedMissions.push(weightedCandidates[selectedIndex].submission);
        weightedCandidates.splice(selectedIndex, 1);
      }
    }

    // 🛡️ 최종 안전장치: 선택된 미션들이 실제로 피드백 가능한지 재검증
    const finalMissions = [];
    for (const target of selectedMissions) {
      // 각 대상 글에 대해 다시 한 번 중복 체크
      const existingFeedback = await Feedback.findOne({
        fromUid: uid,
        toSubmissionId: target._id,
      });

      if (!existingFeedback) {
        finalMissions.push({
          fromUid: uid,
          toSubmissionId: target._id,
          userUid: uid,
          isDone: false,
        });
      } else {
        // 중복 감지 시 조용히 제외
      }
    }

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      missions: finalMissions,
    });
  } catch (err) {
    console.error("❌ 피드백 대상 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 피드백 제출
router.post("/", submitFeedback);

// 내가 받은 피드백 조회
router.get("/received/:uid", async (req, res) => {
  const { uid } = req.params;
  // 사용자 시간대 기준으로 오늘 날짜 계산 (기본값: 한국 시간)
  const today = getTodayDateKoreaFinal();

  try {
    // 오늘의 피드백 카운트 확인
    const todayFeedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      createdAt: {
        $gte: new Date(today),
        $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // 사용자의 제출물 조회
    const userSubmissions = await Submission.find({
      "user.uid": uid,
    });

    // 각 제출물의 피드백 조회 및 작성자 정보 포함
    const feedbacks = await Feedback.find({
      toSubmissionId: { $in: userSubmissions.map((s) => s._id) },
    })
      .populate({
        path: "toSubmissionId",
        select: "user",
      })
      .sort({ createdAt: -1 });

    // 피드백 작성자 정보 매핑
    const feedbackWriters = await Submission.find({
      "user.uid": { $in: feedbacks.map((f) => f.fromUid) },
    }).select("user");

    const writerMap = feedbackWriters.reduce((acc, writer) => {
      acc[writer.user.uid] = writer.user;
      return acc;
    }, {});

    // 제출물별로 피드백 그룹화
    const groupedFeedbacks = feedbacks.reduce((acc, feedback) => {
      const submission = userSubmissions.find(
        (s) => s._id.toString() === feedback.toSubmissionId._id.toString()
      );

      if (submission) {
        const submissionDate = new Date(submission.createdAt)
          .toISOString()
          .slice(0, 10);
        const canViewFeedback =
          submissionDate === today
            ? todayFeedbackCount >= config.FEEDBACK.REQUIRED_COUNT
            : submission.feedbackUnlocked;

        if (canViewFeedback) {
          acc.push({
            toSubmissionId: feedback.toSubmissionId._id,
            content: feedback.content,
            createdAt: feedback.createdAt,
            writer: writerMap[feedback.fromUid] || { displayName: "익명" },
          });
        }
      }
      return acc;
    }, []);

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      totalWritten: todayFeedbackCount,
      groupedBySubmission: groupedFeedbacks,
    });
  } catch (err) {
    console.error("받은 피드백 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 내가 작성한 피드백 조회 (페이지네이션 + mode 필터 + 오늘 요약 포함)
router.get("/given/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const today = getTodayDateKoreaFinal();
    const todayString = today.toISOString().split("T")[0];

    // 내가 작성한 피드백 조회 (populate 없이)
    const myFeedbacks = await Feedback.find({
      fromUid: uid,
    }).lean();

    // 원문 정보를 별도로 조회
    const submissionIds = myFeedbacks
      .map((fb) => fb.toSubmissionId)
      .filter(Boolean);
    const submissions = await Submission.find({
      _id: { $in: submissionIds },
    })
      .select("mode title content user topic createdAt")
      .lean();

    // submissionId를 키로 하는 맵 생성
    const submissionMap = {};
    submissions.forEach((sub) => {
      submissionMap[sub._id.toString()] = sub;
    });

    // 원문 작성자 정보와 텍스트를 포함하여 피드백 데이터 구성
    const enhancedFeedbacks = myFeedbacks.map((feedback) => {
      const submission = submissionMap[feedback.toSubmissionId.toString()];
      return {
        ...feedback,
        submissionAuthor: submission?.user
          ? {
              uid: submission.user.uid,
              displayName: submission.user.displayName || "익명",
              email: submission.user.email || "알 수 없음",
            }
          : null,
        // submissionText가 없으면 submission에서 가져오기 (fallback)
        submissionText:
          feedback.submissionText ||
          submission?.content ||
          "내용을 불러올 수 없습니다.",
        submissionTitle:
          feedback.submissionTitle || submission?.title || "제목 없음",
        submissionTopic: feedback.submissionTopic || submission?.topic || null,
        submissionCreatedAt: submission?.createdAt || null,
        mode: feedback.mode || submission?.mode || null,
      };
    });

    // 오늘 작성한 피드백 요약
    const todayFeedbacks = enhancedFeedbacks.filter(
      (fb) => fb.writtenDate === todayString
    );
    const todaySummary = {
      mode_300: todayFeedbacks.filter((fb) => {
        const submission = submissionMap[fb.toSubmissionId.toString()];
        return submission?.mode === "mode_300";
      }).length,
      mode_1000: todayFeedbacks.filter((fb) => {
        const submission = submissionMap[fb.toSubmissionId.toString()];
        return submission?.mode === "mode_1000";
      }).length,
      total: todayFeedbacks.length,
    };

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      total: enhancedFeedbacks.length,
      feedbacks: enhancedFeedbacks,
      todaySummary,
    });
  } catch (error) {
    console.error("❌ [피드백 미션] 내가 작성한 피드백 조회 오류:", error);
    res.status(500).json({ error: "피드백 조회 실패" });
  }
});

// 유저 활동 통계 조회
router.get("/stats/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // 총 작성한 제출물
    const submissions = await Submission.find({ "user.uid": uid });
    const totalSubmissions = submissions.length;
    const unlockedSubmissions = submissions.filter(
      (s) => s.feedbackUnlocked
    ).length;

    // 내가 작성한 피드백 수
    const feedbackGiven = await Feedback.countDocuments({ fromUid: uid });

    // 내가 받은 피드백 조회 (상세 정보 포함)
    const mySubmissionIds = submissions.map((s) => s._id);
    const receivedFeedbacks = await Feedback.find({
      toSubmissionId: { $in: mySubmissionIds },
    })
      .populate("toSubmissionId", "title text mode createdAt")
      .lean(); // lean() 추가하여 일반 객체로 변환

    // 피드백 작성자 정보 조회
    const feedbackWriterUids = [
      ...new Set(receivedFeedbacks.map((f) => f.fromUid)),
    ];
    const feedbackWriters = await Submission.find({
      "user.uid": { $in: feedbackWriterUids },
    })
      .select("user")
      .lean();

    // 작성자 정보 매핑
    const writerMap = feedbackWriters.reduce((acc, writer) => {
      acc[writer.user.uid] = writer.user;
      return acc;
    }, {});

    // 상세 피드백 정보에 작성자 정보 포함
    const receivedFeedbackDetails = receivedFeedbacks.map((feedback) => ({
      feedbackId: feedback._id,
      submissionId: feedback.toSubmissionId._id,
      submissionTitle: feedback.toSubmissionId.title,
      submissionMode: feedback.toSubmissionId.mode,
      submissionDate: feedback.toSubmissionId.createdAt,
      feedbackContent: feedback.content,
      feedbackDate: feedback.createdAt,
      fromUser: writerMap[feedback.fromUid] || { displayName: "익명" },
    }));

    // unlock 비율 계산
    const unlockRate =
      totalSubmissions === 0
        ? 0
        : Math.round((unlockedSubmissions / totalSubmissions) * 100);

    res.json({
      totalSubmissions,
      unlockedSubmissions,
      feedbackGiven,
      feedbackReceived: receivedFeedbacks.length,
      unlockRate,
      receivedFeedbackDetails,
    });
  } catch (err) {
    console.error("❌ 활동 통계 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 피드백 상태 조회 라우트 추가
router.get("/status/:uid", async (req, res) => {
  const { uid } = req.params;
  const { timezone, offset } = req.query; // 사용자 시간대 정보 받기

  try {
    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (offset !== undefined && timezone) {
      // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
      const { getUserTodayDate } = require("../utils/timezoneUtils");
      const userToday = getUserTodayDate(parseInt(offset));
      todayString = userToday; // ✅ getUserTodayDate는 이미 String 반환
      console.log(
        `🌍 [피드백 상태] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString}`
      );
    } else {
      // 기본값: 한국 시간 기준
      const today = getTodayDateKoreaFinal();
      todayString = today.toISOString().slice(0, 10);
      console.log(
        `🇰🇷 [피드백 상태] 한국 시간 기준 날짜 (기본값): ${todayString}`
      );
    }

    const feedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: todayString,
    });

    const submissions = await Submission.find({
      "user.uid": uid,
      submissionDate: todayString,
    });

    res.json({
      feedbackCount,
      requiredCount: config.FEEDBACK.REQUIRED_COUNT,
      isUnlocked: feedbackCount >= config.FEEDBACK.REQUIRED_COUNT,
      submissionsCount: submissions.length,
    });
  } catch (err) {
    console.error("❌ 피드백 상태 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 오늘의 피드백 현황 조회 (특정 유저가 작성한 피드백)
router.get("/today/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { timezone, offset } = req.query; // 사용자 시간대 정보 받기

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();
    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (offset !== undefined && timezone) {
      // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
      const { getUserTodayDate } = require("../utils/timezoneUtils");
      const userToday = getUserTodayDate(parseInt(offset));
      // getUserTodayDate는 이미 YYYY-MM-DD 문자열을 반환함
      todayString = userToday;
      if (shouldLogWithTime(uid, "feedback_timezone_info", 10)) {
        console.log(
          `🌍 [피드백 현황] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString}`
        );
      }
    } else {
      // 기본값: 한국 시간 기준
      const today = getTodayDateKoreaFinal();
      todayString = today.toISOString().slice(0, 10);
      if (shouldLogWithTime(uid, "feedback_korea_date", 10)) {
        console.log(
          `🇰🇷 [피드백 현황] ${user.email} - 한국 시간 기준 날짜 (기본값): ${todayString}`
        );
      }
    }

    // 특정 유저가 오늘 작성한 피드백만 조회
    const todayFeedbacks = await Feedback.find({
      fromUid: uid, // 피드백 작성자
      writtenDate: todayString,
    })
      .populate({
        path: "toSubmissionId",
        select: "mode title content",
        model: "Submission",
      })
      .lean();

    // 모드별 피드백 수 계산
    const mode300Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_300"
    ).length;
    const mode1000Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_1000"
    ).length;
    const totalTodayCount = mode300Count + mode1000Count;

    const dateKey = todayString;
    const scopeKey = `user_today_${uid}_${dateKey}`;
    if (
      shouldLogOnChange(scopeKey, {
        mode300: mode300Count,
        mode1000: mode1000Count,
        total: totalTodayCount,
      }) ||
      shouldLogWithTime(uid, "feedback_count_summary", 10)
    ) {
    }

    // 캐시 정리
    cleanupLogCache();

    res.json({
      user: {
        uid: uid,
        email: user.email,
        displayName: user.displayName,
      },
      mode_300: mode300Count,
      mode_1000: mode1000Count,
      total: totalTodayCount,
    });
  } catch (error) {
    console.error("❌ [피드백 현황] API 오류:", error);
    res.status(500).json({ error: "피드백 현황 조회 실패" });
  }
});

// 전체 시스템의 오늘 피드백 현황 조회 (관리자용)
router.get("/system/today", async (req, res) => {
  try {
    const { timezone, offset } = req.query; // 사용자 시간대 정보 받기

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (offset !== undefined && timezone) {
      // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
      const { getUserTodayDate } = require("../utils/timezoneUtils");
      const userToday = getUserTodayDate(parseInt(offset));
      // getUserTodayDate는 이미 YYYY-MM-DD 문자열을 반환함
      todayString = userToday;
      if (shouldLogWithTime("system", "system_feedback_timezone_info", 10)) {
        console.log(
          `🌍 [시스템 피드백 현황] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString}`
        );
      }
    } else {
      // 기본값: 한국 시간 기준
      const today = getTodayDateKoreaFinal();
      todayString = today.toISOString().slice(0, 10);
      if (shouldLogWithTime("system", "system_feedback_korea_date", 10)) {
        console.log(
          `🇰🇷 [시스템 피드백 현황] 시스템 전체 - 한국 시간 기준 날짜 (기본값): ${todayString}`
        );
      }
    }

    // 전체 시스템의 오늘 작성된 피드백 조회
    const todayFeedbacks = await Feedback.find({
      writtenDate: todayString,
    })
      .populate({
        path: "toSubmissionId",
        select: "mode title content",
        model: "Submission",
      })
      .lean();

    // 모드별 피드백 수 계산
    const mode300Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_300"
    ).length;
    const mode1000Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_1000"
    ).length;
    const totalTodayCount = mode300Count + mode1000Count;

    const systemScopeKey = `system_today_${todayString}`;
    if (
      shouldLogOnChange(systemScopeKey, {
        mode300: mode300Count,
        mode1000: mode1000Count,
        total: totalTodayCount,
      }) ||
      shouldLogWithTime("system", "system_feedback_count_summary", 10)
    ) {
    }

    // 캐시 정리
    cleanupLogCache();

    res.json({
      mode_300: mode300Count,
      mode_1000: mode1000Count,
      total: totalTodayCount,
      date: todayString,
      summary: `전체 시스템에서 오늘 ${totalTodayCount}개의 피드백이 작성되었습니다.`,
    });
  } catch (error) {
    console.error("❌ [시스템 피드백 현황] API 오류:", error);
    res.status(500).json({ error: "시스템 피드백 현황 조회 실패" });
  }
});

// 피드백 열람 가능 여부 확인
router.get("/unlock-status/:uid", async (req, res) => {
  const { uid } = req.params;
  // 한국 시간 기준으로 오늘 날짜 계산 (일관된 방식)
  const today = getTodayDateKoreaFinal();

  try {
    const feedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      createdAt: {
        $gte: new Date(today),
        $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    const isUnlocked = feedbackCount >= config.FEEDBACK.REQUIRED_COUNT;
    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      isUnlocked,
      feedbackCount,
    });
  } catch (err) {
    console.error("피드백 언락 상태 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 황금열쇠드백 언락하기
router.post("/unlock-feedback", async (req, res) => {
  const { uid, unlockType, submissionId } = req.body;
  const requiredTokens = unlockType === "single" ? 1 : 2;

  try {
    // Token 모델에서 황금열쇠 확인
    const userToken = await Token.findOne({ uid });
    if (!userToken || userToken.goldenKeys < requiredTokens) {
      return res.status(403).json({
        message: `황금열쇠가 부족합니다. (필요: ${requiredTokens}개)`,
      });
    }

    // 언락 타입에 따른 처리
    if (unlockType === "single") {
      await Submission.findOneAndUpdate(
        { _id: submissionId, "user.uid": uid },
        { feedbackUnlocked: true }
      );
    } else if (unlockType === "period") {
      const targetSubmission = await Submission.findById(submissionId);
      await Submission.updateMany(
        {
          "user.uid": uid,
          submissionDate: { $lte: targetSubmission.submissionDate },
          feedbackUnlocked: false, // 이미 언락된 것은 제외
        },
        { feedbackUnlocked: true }
      );
    }

    // 황금열쇠 차감
    userToken.goldenKeys -= requiredTokens;
    await userToken.save();

    // 콘솔 로그 추가
    console.log(
      `[황금열쇠 사용] ${userToken.user.email}: 피드백 언락 (${
        unlockType === "single" ? "단일" : "기간"
      }) (-${requiredTokens})`
    );

    // 토큰 히스토리 기록 (새로운 방식)
    await handleTokenChange(uid, {
      type: "FEEDBACK_UNLOCK",
      amount: -requiredTokens,
      mode: unlockType === "single" ? "single_unlock" : "period_unlock",
      timestamp: new Date(),
    });

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      message:
        unlockType === "single"
          ? "피드백이 성공적으로 언락되었습니다."
          : "선택한 글을 포함한 과거의 모든 피드백이 언락되었습니다.",
      remainingGoldenKeys: userToken.goldenKeys,
    });
  } catch (error) {
    console.error("피드백 언락 실패:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 좋아요 토글 API
router.post("/:submissionId/like", async (req, res) => {
  const { submissionId } = req.params;
  const { uid, displayName } = req.body;

  if (!uid || !displayName) {
    return res.status(400).json({ message: "uid와 displayName이 필요합니다." });
  }

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "글을 찾을 수 없습니다." });
    }

    const alreadyLiked = submission.likedUsers.some((user) => user.uid === uid);

    if (alreadyLiked) {
      submission.likedUsers = submission.likedUsers.filter(
        (user) => user.uid !== uid
      );
      submission.likeCount = Math.max(0, submission.likeCount - 1);
    } else {
      submission.likedUsers.push({ uid, displayName });
      submission.likeCount += 1;
    }

    await submission.save();

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      liked: !alreadyLiked,
      total: submission.likeCount,
    });
  } catch (err) {
    console.error("좋아요 토글 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 좋아요 상태 조회
router.get("/:submissionId/like-status", async (req, res) => {
  const { submissionId } = req.params;
  const { uid } = req.query; // ✅ 쿼리에서 uid만 받음

  if (!uid) {
    return res.status(400).json({ message: "uid가 필요합니다." });
  }

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "글을 찾을 수 없습니다." });
    }

    const liked = submission.likedUsers.some((user) => user.uid === uid); // ✅ 객체 배열 체크
    const likedUsernames = submission.likedUsers.map(
      (user) => user.displayName
    );

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      total: submission.likeCount,
      liked,
      likedUsernames,
    });
  } catch (err) {
    console.error("좋아요 상태 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 전체 피드백 가능한 글 목록 (페이지네이션 + 검색 + 모드 필터 지원)
router.get("/all-submissions/:uid", async (req, res) => {
  const { uid } = req.params;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const search = req.query.search;
  const mode = req.query.mode;

  try {
    // 1. 먼저 전체 피드백 가능한 글 수 계산 (필터링 없음)
    const baseQuery = {
      "user.uid": { $ne: uid }, // 본인 글 제외
      isDeleted: { $ne: true }, // 삭제된 글 제외
    };

    // 내가 작성한 피드백 목록 조회
    const myFeedbacks = await Feedback.find({ fromUid: uid })
      .select("toSubmissionId")
      .lean();

    const myFeedbackSet = new Set(
      myFeedbacks.map((fb) => fb.toSubmissionId?.toString()).filter(Boolean)
    );

    // 전체 피드백 가능한 글 수 계산 (필터링 없음)
    const allSubmissions = await Submission.find(baseQuery).lean();
    const totalFeedbackAvailableCount = allSubmissions.filter(
      (sub) => !myFeedbackSet.has(sub._id.toString())
    ).length;

    // 2. 필터링된 쿼리 생성
    const filteredQuery = { ...baseQuery };
    if (search) {
      // 업계 표준: 정규표현식 완전 제거, MongoDB $text 검색 사용 (성능 향상 + 안전성)
      filteredQuery.$text = { $search: search };
    }
    if (mode === "mode_300" || mode === "mode_1000") {
      filteredQuery.mode = mode;
    }

    const skip = (page - 1) * limit;

    // 3. 필터링된 결과에 대한 페이지네이션
    const [
      totalCount,
      mode300Count,
      mode1000Count,
      feedbackGivenCount,
      feedbackAvailableCount_300,
      feedbackAvailableCount_1000,
    ] = await Promise.all([
      Submission.countDocuments(baseQuery), // 전체
      Submission.countDocuments({ ...baseQuery, mode: "mode_300" }),
      Submission.countDocuments({ ...baseQuery, mode: "mode_1000" }),
      Feedback.countDocuments({ fromUid: uid }),
      Submission.countDocuments({
        ...baseQuery,
        mode: "mode_300",
        _id: { $nin: Array.from(myFeedbackSet) },
      }),
      Submission.countDocuments({
        ...baseQuery,
        mode: "mode_1000",
        _id: { $nin: Array.from(myFeedbackSet) },
      }),
    ]);

    // 이미 피드백한 글을 제외한 쿼리 생성
    const finalQuery = {
      ...filteredQuery,
      _id: { $nin: Array.from(myFeedbackSet) },
    };

    const submissions = await Submission.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const feedbackCounts = await Feedback.aggregate([
      {
        $match: {
          toSubmissionId: {
            $in: submissions.map((s) => s._id),
          },
        },
      },
      {
        $group: {
          _id: "$toSubmissionId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    feedbackCounts.forEach((fc) => {
      countMap[fc._id.toString()] = fc.count;
    });

    const hasMore = skip + submissions.length < totalCount;

    const results = submissions.map((sub) => ({
      ...sub,
      feedbackCount: countMap[sub._id.toString()] || 0,
      hasGivenFeedback: myFeedbackSet.has(sub._id.toString()),
    }));

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      submissions: results,
      hasMore,
      totalCount,
      mode300Count,
      mode1000Count,
      feedbackGivenCount,
      feedbackAvailableCount: totalFeedbackAvailableCount,
      feedbackAvailableCount_300,
      feedbackAvailableCount_1000,
    });
  } catch (err) {
    console.error("❌ 전체 글 목록 조회 실패:", err);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// 오늘 내가 남긴 피드백(모드별) 개수 반환
router.get("/given-today/:uid", async (req, res) => {
  const { uid } = req.params;
  // 사용자 시간대 기준으로 오늘 날짜 계산 (기본값: 한국 시간)
  const today = getTodayDateKoreaFinal();

  // writtenDate는 String 타입이므로 날짜 문자열로 비교
  const todayString = today.toISOString().slice(0, 10); // YYYY-MM-DD 형식

  // 오늘 내가 남긴 피드백 모두 조회
  const feedbacks = await Feedback.find({
    fromUid: uid,
    writtenDate: todayString,
  });

  // 모드별 개수 집계
  const mode300 = feedbacks.filter(
    (fb) => fb.submissionMode === "mode_300"
  ).length;
  const mode1000 = feedbacks.filter(
    (fb) => fb.submissionMode === "mode_1000"
  ).length;

  // 사용자 정보 조회
  const user = await User.findOne({ uid }).select("email displayName").lean();

  res.json({
    user: user
      ? {
          uid: uid,
          email: user.email,
          displayName: user.displayName,
        }
      : null,
    mode_300: mode300,
    mode_1000: mode1000,
    total: feedbacks.length,
  });
});

router.get("/all-dates/:uid", async (req, res) => {
  const { uid } = req.params;
  const submissions = await Submission.find({ "user.uid": uid }).select(
    "createdAt mode submissionDate"
  );

  // 날짜별로 모드 정보를 그룹화
  const dateModeMap = new Map();
  submissions.forEach((sub) => {
    const date = sub.createdAt.toISOString().slice(0, 10);
    if (!dateModeMap.has(date)) {
      dateModeMap.set(date, new Set());
    }
    if (sub.mode === "mode_300" || sub.mode === "mode_1000") {
      dateModeMap.get(date).add(sub.mode);
    }
  });

  const dates = Array.from(dateModeMap.keys());
  const todayModes =
    dateModeMap.get(new Date().toISOString().slice(0, 10)) || new Set();

  // 사용자 정보 조회
  const user = await User.findOne({ uid }).select("email displayName").lean();

  res.json({
    user: user
      ? {
          uid: uid,
          email: user.email,
          displayName: user.displayName,
        }
      : null,
    dates: dates,
    todayModes: Array.from(todayModes),
  });
});

// 황금열쇠로 딜라이팅AI 버전 언락하기
router.post("/unlock-dilating", async (req, res) => {
  const { uid, submissionId } = req.body;
  const requiredTokens = 1; // 딜라이팅AI 버전은 황금열쇠 1개

  try {
    // Token 모델에서 황금열쇠 확인
    const userToken = await Token.findOne({ uid });
    if (!userToken || userToken.goldenKeys < requiredTokens) {
      return res.status(403).json({
        message: `황금열쇠가 부족합니다. (필요: ${requiredTokens}개, 보유: ${
          userToken?.goldenKeys || 0
        }개)`,
      });
    }

    // 제출글 확인
    const submission = await Submission.findOne({
      _id: submissionId,
      "user.uid": uid,
    });
    if (!submission) {
      return res.status(404).json({
        message: "해당 글을 찾을 수 없습니다.",
      });
    }

    // 이미 AI 피드백이 있는지 확인
    if (!submission.aiFeedback) {
      return res.status(400).json({
        message: "AI 피드백이 없는 글입니다.",
      });
    }

    // 딜라이팅AI 버전 언락 상태 저장
    submission.dilatingVersionUnlocked = true;
    await submission.save();

    // 황금열쇠 차감
    userToken.goldenKeys -= requiredTokens;
    await userToken.save();

    // 콘솔 로그 추가
    console.log(
      `[황금열쇠 사용] ${userToken.user.email}: 딜라이팅AI 버전 구매 (-${requiredTokens})`
    );

    // 토큰 히스토리 기록
    await handleTokenChange(uid, {
      type: "DILATING_UNLOCK",
      amount: -requiredTokens,
      mode: "dilating_unlock",
      timestamp: new Date(),
    });

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();

    res.json({
      user: user
        ? {
            uid: uid,
            email: user.email,
            displayName: user.displayName,
          }
        : null,
      message: "딜라이팅AI 버전이 성공적으로 구매되었습니다.",
      remainingGoldenKeys: userToken.goldenKeys,
    });
  } catch (error) {
    console.error("[딜라이팅AI 버전 구매 에러]", error);
    res.status(500).json({
      message: "딜라이팅AI 버전 구매 중 오류가 발생했습니다.",
    });
  }
});

// 오늘 피드백 현황 조회 (특정 유저가 작성한 피드백)
router.get("/today/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { timezone, offset } = req.query; // 사용자 시간대 정보 받기

    // 사용자 정보 조회
    const user = await User.findOne({ uid }).select("email displayName").lean();
    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 사용자 시간대 기준으로 오늘 날짜 계산
    let todayString;
    if (offset !== undefined && timezone) {
      // 사용자 시간대 정보가 있으면 사용자 기준으로 계산
      const { getUserTodayDate } = require("../utils/timezoneUtils");
      const userToday = getUserTodayDate(parseInt(offset));
      // getUserTodayDate는 이미 YYYY-MM-DD 문자열을 반환함
      todayString = userToday;
      if (shouldLogWithTime(uid, "feedback_today_timezone_info", 10)) {
        console.log(
          `🌍 [오늘 피드백] 사용자 시간대 기준 날짜: ${timezone} (offset: ${offset}) -> ${todayString}`
        );
      }
    } else {
      // 기본값: 한국 시간 기준
      const today = getTodayDateKoreaFinal();
      todayString = today.toISOString().slice(0, 10);
      if (shouldLogWithTime(uid, "feedback_today_korea_date", 10)) {
        console.log(
          `🇰🇷 [오늘 피드백] ${user.email} - 한국 시간 기준 날짜 (기본값): ${todayString}`
        );
      }
    }

    // 특정 유저가 오늘 작성한 피드백만 조회
    const todayFeedbacks = await Feedback.find({
      fromUid: uid, // 피드백 작성자
      writtenDate: todayString,
    })
      .populate({
        path: "toSubmissionId",
        select: "mode title content",
        model: "Submission",
      })
      .lean();

    // 모드별 피드백 수 계산
    const mode300Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_300"
    ).length;
    const mode1000Count = todayFeedbacks.filter(
      (fb) => fb.toSubmissionId?.mode === "mode_1000"
    ).length;
    const totalTodayCount = mode300Count + mode1000Count;

    const dateKey = todayString;
    const scopeKey = `user_today_${uid}_${dateKey}`;
    if (
      shouldLogOnChange(scopeKey, {
        mode300: mode300Count,
        mode1000: mode1000Count,
        total: totalTodayCount,
      }) ||
      shouldLogWithTime(uid, "feedback_today_count_summary", 10)
    ) {
      console.log(
        `📊 [오늘 피드백] ${user.email} - ${dateKey}: 300자(${mode300Count}), 1000자(${mode1000Count}), 총 ${totalTodayCount}개`
      );
    }

    // 캐시 정리
    cleanupLogCache();

    res.json({
      user: {
        uid: uid,
        email: user.email,
        displayName: user.displayName,
      },
      mode_300: mode300Count,
      mode_1000: mode1000Count,
      total: totalTodayCount,
    });
  } catch (error) {
    console.error("❌ [오늘 피드백] API 오류:", error);
    res.status(500).json({ error: "오늘 피드백 현황 조회 실패" });
  }
});

// 🧪 시간대 테스트용 디버깅 엔드포인트
router.get("/debug/timezone", async (req, res) => {
  try {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const testResults = {
      serverTime: {
        utc: now.toISOString(),
        local: now.toLocaleString(),
        date: now.toDateString(),
      },
      koreaTime: {
        utc: koreaTime.toISOString(),
        local: koreaTime.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
        date: koreaTime.toDateString(),
      },
      functions: {
        getUserTodayDate: getUserTodayDate(-540).toISOString(), // 한국 시간 기준 (offset: -540)
        getTodayDateKorea: getTodayDateKorea().toISOString(),
        getTodayDateKoreaFinal: getTodayDateKoreaFinal().toISOString(),
      },
      timezoneInfo: {
        userTimezone: "Asia/Seoul (UTC+9)",
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: "UTC+0 (서버)",
      },
    };

    console.log("🧪 시간대 테스트 결과:", testResults);
    res.json(testResults);
  } catch (error) {
    console.error("❌ 시간대 테스트 에러:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
