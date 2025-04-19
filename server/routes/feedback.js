// routes/feedback.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const mongoose = require("mongoose");
const config = require("../config");

// 피드백할 글 추천 (적게 받은 글 우선)
router.get("/assignments/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
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

    // 전체 제출된 글 중 본인 글 + 이미 피드백한 글 제외
    const candidates = await Submission.aggregate([
      {
        $match: {
          "user.uid": { $ne: uid },
          _id: {
            $nin: givenIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $lookup: {
          from: Feedback.collection.name, // 실제 컬렉션 이름 사용
          localField: "_id",
          foreignField: "toSubmissionId",
          as: "feedbacks",
        },
      },
      {
        $addFields: {
          feedbackCount: { $size: "$feedbacks" },
        },
      },
      {
        $sort: { feedbackCount: 1, createdAt: 1 }, // submittedAt → createdAt
      },
      {
        $project: {
          text: 1,
          user: 1,
          createdAt: 1,
          feedbackCount: 1,
        },
      },
    ]);

    res.json(candidates);
  } catch (err) {
    console.error("❌ 피드백 대상 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 피드백 제출
router.post("/", async (req, res) => {
  const { toSubmissionId, fromUid, content } = req.body;

  if (
    !toSubmissionId ||
    !fromUid ||
    !content ||
    content.trim().length < config.FEEDBACK.MIN_LENGTH
  ) {
    return res
      .status(400)
      .json({ message: "유효한 피드백 데이터를 입력해주세요." });
  }

  try {
    // ObjectId 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(toSubmissionId)) {
      return res
        .status(400)
        .json({ message: "유효하지 않은 제출물 ID입니다." });
    }

    // 작성한 글 여부 확인
    const hasSubmission = await Submission.exists({ "user.uid": fromUid });
    if (!hasSubmission) {
      return res
        .status(403)
        .json({ message: "글을 작성한 사용자만 피드백을 남길 수 있습니다." });
    }

    // 중복 피드백 체크
    const existing = await Feedback.findOne({ toSubmissionId, fromUid });
    if (existing) {
      return res
        .status(409)
        .json({ message: "이미 이 글에 피드백을 작성했습니다." });
    }

    await Feedback.create({ fromUid, toSubmissionId, content });

    res.status(200).json({ message: "피드백이 저장되었습니다!" });
  } catch (err) {
    console.error("❌ 피드백 저장 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 내가 받은 피드백 조회
router.get("/received/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    const feedbackCount = await Feedback.countDocuments({ fromUid: uid });
    const mySubmissions = await Submission.find({ "user.uid": uid }).select(
      "_id"
    );
    if (!mySubmissions.length) {
      return res.json({ totalWritten: feedbackCount, groupedBySubmission: [] });
    }

    const mySubmissionIds = mySubmissions.map((doc) => doc._id);

    const allFeedbacks = await Feedback.find({
      toSubmissionId: { $in: mySubmissionIds },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "toSubmissionId",
        select: "text",
      });

    const groupedBySubmission = allFeedbacks
      .filter((fb) => fb.toSubmissionId) // null 필터링
      .map((fb) => ({
        toSubmissionId: fb.toSubmissionId._id.toString(),
        content: fb.content,
        submissionText: fb.toSubmissionId.text || "",
        createdAt: fb.createdAt,
      }));

    res.json({
      totalWritten: feedbackCount,
      groupedBySubmission,
    });
  } catch (err) {
    console.error("❌ 피드백 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 내가 작성한 피д백 조회 (페이지네이션 포함)
router.get("/given/:uid", async (req, res) => {
  const { uid } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    const feedbacks = await Feedback.find({ fromUid: uid })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "toSubmissionId",
        select: "text",
      });

    const total = await Feedback.countDocuments({ fromUid: uid });

    const transformed = feedbacks.map((fb) => ({
      _id: fb._id,
      content: fb.content,
      fromUid: fb.fromUid,
      toSubmissionId: fb.toSubmissionId?._id || null,
      submissionText: fb.toSubmissionId?.text || "",
      createdAt: fb.createdAt,
    }));

    res.json({ page, total, feedbacks: transformed });
  } catch (err) {
    console.error("❌ 내가 작성한 피드백 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

// 전체 글 리스트 + 피드백 수 + 내가 피드백했는지 여부 반환
router.get("/all-submissions/:uid", async (req, res) => {
  const { uid } = req.params;

  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ message: "유효하지 않은 UID입니다." });
  }

  try {
    const submissions = await Submission.find({
      "user.uid": { $ne: uid },
    }).lean();

    const feedbackCounts = await Feedback.aggregate([
      {
        $match: { toSubmissionId: { $in: submissions.map((s) => s._id) } },
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

    const myFeedbacks = await Feedback.find({ fromUid: uid }).select(
      "toSubmissionId"
    );
    const myFeedbackSet = new Set(
      myFeedbacks.map((fb) =>
        mongoose.Types.ObjectId.isValid(fb.toSubmissionId)
          ? fb.toSubmissionId.toString()
          : null
      )
    );

    const results = submissions.map((sub) => ({
      _id: sub._id,
      text: sub.text,
      user: sub.user,
      submittedAt: sub.createdAt, // submittedAt → createdAt
      feedbackCount: countMap[sub._id.toString()] || 0,
      hasGivenFeedback: myFeedbackSet.has(sub._id.toString()),
    }));

    results.sort(
      (a, b) =>
        a.feedbackCount - b.feedbackCount || a.submittedAt - b.submittedAt
    );

    res.json(results);
  } catch (err) {
    console.error("❌ 전체 글 + 피드백 수 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

module.exports = router;
