// routes/feedback.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const mongoose = require("mongoose");
const config = require("../config");
const { submitFeedback } = require("../controllers/feedbackController");
const WritingStreak = require("../models/WritingStreak");
const Token = require("../models/Token");
const { handleTokenChange } = require("../utils/tokenHistory");
const HelpfulVote = require("../models/HelpfulVote");

// 피드백할 글 추천 (모드 동일 + 적게 받은 글 우선)
router.get("/assignments/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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

    // 이미 피드백한 글 ID 목록
    const givenFeedbacks = await Feedback.find({ fromUid: uid }).select(
      "toSubmissionId"
    );
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

    // 미션 생성
    const missions = selectedMissions.map((target) => ({
      fromUid: uid,
      toSubmissionId: target._id,
      userUid: uid,
      isDone: false,
    }));

    res.json(missions);
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
  const today = new Date().toISOString().slice(0, 10);

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

    res.json({
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
  const { uid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const mode = req.query.mode;
  const today = new Date().toISOString().slice(0, 10);

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    const feedbacksRaw = await Feedback.find({ fromUid: uid })
      .sort({ createdAt: -1 })
      .populate({
        path: "toSubmissionId",
        select: "text mode user createdAt title topic",
      });

    // ✅ mode별로 필터링
    const feedbacks = feedbacksRaw.filter((fb) => {
      if (!fb.toSubmissionId) return false;
      if (mode === "mode_300" || mode === "mode_1000") {
        return fb.toSubmissionId.mode === mode;
      }
      return true;
    });

    const total = feedbacks.length;
    const paged = feedbacks.slice((page - 1) * limit, page * limit);

    const transformed = paged.map((fb) => ({
      _id: fb._id,
      content: fb.content,
      fromUid: fb.fromUid,
      toSubmissionId: fb.toSubmissionId?._id || null,
      submissionTitle: fb.toSubmissionId?.title || "",
      submissionText: fb.toSubmissionId?.text || "",
      submissionTopic: fb.toSubmissionId?.topic || "",
      mode: fb.toSubmissionId?.mode || null,
      createdAt: fb.createdAt,
      submissionAuthor: fb.toSubmissionId?.user || null,
      submissionCreatedAt: fb.toSubmissionId?.createdAt || null,
    }));

    // ✅ 오늘 쓴 피드백 요약
    let todayMode_300 = 0;
    let todayMode_1000 = 0;

    feedbacksRaw.forEach((fb) => {
      if (fb.writtenDate === today && fb.toSubmissionId) {
        if (fb.toSubmissionId.mode === "mode_300") todayMode_300++;
        if (fb.toSubmissionId.mode === "mode_1000") todayMode_1000++;
      }
    });

    res.json({
      page,
      total,
      feedbacks: transformed,
      todaySummary: {
        mode_300: todayMode_300,
        mode_1000: todayMode_1000,
      },
    });
  } catch (err) {
    console.error("❌ 내가 작성한 피드백 조회 실패:", err);
    res.status(500).json({ message: err.message });
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
  const today = new Date().toISOString().slice(0, 10);

  try {
    const feedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: today,
    });

    const submissions = await Submission.find({
      "user.uid": uid,
      submissionDate: today,
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

// 오늘의 피드백 카운트 조회
router.get("/today/:uid", async (req, res) => {
  const { uid } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const count = await Feedback.countDocuments({
      fromUid: uid,
      writtenDate: today,
    });

    res.json({ count });
  } catch (err) {
    console.error("오늘의 피드백 카운트 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 피드백 열람 가능 여부 확인
router.get("/unlock-status/:uid", async (req, res) => {
  const { uid } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const feedbackCount = await Feedback.countDocuments({
      fromUid: uid,
      createdAt: {
        $gte: new Date(today),
        $lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const isUnlocked = feedbackCount >= config.FEEDBACK.REQUIRED_COUNT;
    res.json({ isUnlocked, feedbackCount });
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
          createdAt: { $lte: targetSubmission.createdAt },
        },
        { feedbackUnlocked: true }
      );
    }

    // 황금열쇠 차감
    userToken.goldenKeys -= requiredTokens;
    await userToken.save();

    // 토큰 히스토리 기록 (새로운 방식)
    await handleTokenChange(uid, {
      type: "FEEDBACK_UNLOCK",
      amount: -requiredTokens,
      mode: unlockType === "single" ? "single_unlock" : "period_unlock",
      timestamp: new Date(),
    });

    res.json({
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

    res.json({
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

    res.json({
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
      filteredQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ];
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

    const submissions = await Submission.find(filteredQuery)
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

    res.json({
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

module.exports = router;
