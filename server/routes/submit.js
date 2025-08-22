// server/routes/submit.js
const express = require("express");
const router = express.Router();
const {
  handleSubmit,
  unlockFeedback,
} = require("../controllers/submitController");
const Submission = require("../models/Submission");
const UserToken = require("../models/Token");
const Feedback = require("../models/Feedback");
const { authenticateToken } = require("../middleware/auth");

// 모든 submit 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// ✍ 글 제출
router.post("/", handleSubmit);
router.patch("/unlock-feedback/:id", unlockFeedback);

// 🧑 유저 글 조회 (검색 쿼리 + 페이지네이션 지원)
router.get("/user/:uid", async (req, res) => {
  const { uid } = req.params;
  const page = req.query.page ? parseInt(req.query.page) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const search = req.query.search;

  try {
    const query = { "user.uid": uid };

    if (search) {
      // 업계 표준: 정규표현식 완전 제거, MongoDB $text 검색 사용 (성능 향상 + 안전성)
      // MongoDB $text 검색을 사용하려면 text 인덱스가 필요합니다
      query.$text = { $search: search };
    }

    let submissions;
    let hasMore = false;

    if (page && limit) {
      const skip = (page - 1) * limit;
      submissions = await Submission.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const total = await Submission.countDocuments(query);
      hasMore = skip + submissions.length < total;
    } else {
      submissions = await Submission.find(query).sort({ createdAt: -1 });
    }

    res.json({ submissions, hasMore });
  } catch (err) {
    console.error("❌ 글 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류입니다." });
  }
});

// ✅ 유저 전체 글 요약 카운트
router.get("/summary/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const submissions = await Submission.find({ "user.uid": uid }).select(
      "_id mode feedbackUnlocked"
    );

    const submissionIds = submissions.map((s) => s._id);

    const feedbacks = await Feedback.find({
      toSubmissionId: { $in: submissionIds },
    }).select("toSubmissionId");

    const feedbackCountMap = feedbacks.reduce((map, fb) => {
      const id = fb.toSubmissionId?.toString();
      if (!id) return map;
      map[id] = (map[id] || 0) + 1;
      return map;
    }, {});

    const summary = {
      all: submissions.length,
      mode_300: submissions.filter((s) => s.mode === "mode_300").length,
      mode_1000: submissions.filter((s) => s.mode === "mode_1000").length,
      has_feedback: submissions.filter(
        (s) => feedbackCountMap[s._id.toString()] > 0
      ).length,
      // open_feedback: submissions.filter(
      //   (s) => s.feedbackUnlocked && feedbackCountMap[s._id.toString()] > 0
      // ).length,
      open_feedback: submissions.filter((s) => s.feedbackUnlocked).length,
      locked_feedback: submissions.filter((s) => !s.feedbackUnlocked).length,
    };

    res.json(summary);
  } catch (err) {
    console.error("❌ summary API 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 🪙 유저 토큰 조회
router.get("/tokens/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const tokenData = await UserToken.findOne({ uid });
    if (!tokenData) {
      return res.status(404).json({ message: "유저 토큰 없음" });
    }

    res.json({ tokens: tokenData.tokens });
  } catch (err) {
    console.error("❌ 토큰 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 인기 글 조회
router.get("/popular", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // 1. 최근 3일 이내 글만 대상으로 인기글 조회
    let popularSubmissions = await Submission.find({
      createdAt: { $gte: threeDaysAgo },
    })
      .sort({ feedbackCount: -1, likeCount: -1, createdAt: -1 })
      .limit(limit)
      .select("title text topic likeCount feedbackCount createdAt mode");

    // 2. 만약 3일 이내 글이 부족하면, 전체에서 인기글로 채움
    if (popularSubmissions.length < limit) {
      const additionalNeeded = limit - popularSubmissions.length;
      // 이미 뽑은 글의 _id는 제외
      const excludeIds = popularSubmissions.map((sub) => sub._id);

      const fallbackSubmissions = await Submission.find({
        _id: { $nin: excludeIds },
      })
        .sort({ feedbackCount: -1, likeCount: -1, createdAt: -1 })
        .limit(additionalNeeded)
        .select("title text topic likeCount feedbackCount createdAt mode");

      // 최종 결과 합치기
      popularSubmissions = popularSubmissions.concat(fallbackSubmissions);
    }

    res.json(popularSubmissions);
  } catch (err) {
    console.error("🔥 인기 글 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 랜딩페이지 최근 글 조회
router.get("/recent", async (req, res) => {
  try {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("title text user mode likeCount createdAt topic") // topic 필드 포함
      .lean();

    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      data: submissions.map((sub) => ({
        _id: sub._id,
        title: sub.title,
        text: sub.text,
        topic: sub.topic,
        mode: sub.mode,
        likeCount: sub.likeCount,
        createdAt: sub.createdAt,
        user: {
          displayName: sub.user.displayName || "익명",
          email: sub.user.email,
        },
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// 최근 AI 피드백 가져오기
router.get("/ai-feedback", async (req, res) => {
  try {
    const recentSubmissions = await Submission.aggregate([
      {
        $match: {
          score: { $exists: true, $ne: null },
          aiFeedback: { $exists: true, $ne: null },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "user.uid",
          foreignField: "uid",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          id: "$_id",
          title: "$title",
          originalText: "$text", // text 필드가 실제 원문 내용
          content: "$text", // text 필드를 content로도 제공
          feedback: "$aiFeedback",
          score: "$score",
          user: {
            displayName: "$user.displayName",
          },
          mode: "$mode",
          topic: "$topic",
          createdAt: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: recentSubmissions,
    });
  } catch (error) {
    console.error("AI 피드백 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "AI 피드백 조회 중 오류가 발생했습니다.",
    });
  }
});

module.exports = router;
