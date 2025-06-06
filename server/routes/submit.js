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
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { text: { $regex: search, $options: "i" } },
      ];
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

    const popularSubmissions = await Submission.find({})
      .sort({ likeCount: -1, feedbackCount: -1, createdAt: -1 }) // 좋아요 > 피드백 > 최신순
      .limit(limit)
      .select("title text topic likeCount feedbackCount createdAt mode"); // ✅ topic 추가

    res.json(popularSubmissions);
  } catch (err) {
    console.error("🔥 인기 글 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
