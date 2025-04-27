// routes/feedback.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const mongoose = require("mongoose");
const config = require("../config");

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

    // 작성한 글 여부 확인 및 모드 가져오기
    const userSubmission = await Submission.findOne({
      "user.uid": fromUid,
      submissionDate: new Date().toISOString().slice(0, 10), // 오늘 작성한 글만
    }).sort({ createdAt: -1 });

    if (!userSubmission) {
      return res.status(403).json({
        message: "오늘 글을 작성한 사용자만 피드백을 남길 수 있습니다.",
      });
    }

    // 피드백 대상 글 가져오기
    const targetSubmission = await Submission.findById(toSubmissionId);
    if (!targetSubmission) {
      return res
        .status(404)
        .json({ message: "피드백 대상 글을 찾을 수 없습니다." });
    }

    // 교차 피드백 검증
    if (config.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
      const allowedModes =
        config.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[userSubmission.mode];
      if (!allowedModes || !allowedModes.includes(targetSubmission.mode)) {
        return res.status(400).json({
          message: "현재 모드에서는 해당 글에 피드백을 줄 수 없습니다.",
        });
      }
    } else {
      // 교차 피드백이 비활성화된 경우에만 모드 검증
      if (userSubmission.mode !== targetSubmission.mode) {
        return res.status(400).json({
          message: `${
            userSubmission.mode === "mode_300" ? "300자" : "1000자"
          } 모드로 작성한 글에만 피드백을 줄 수 있습니다.`,
        });
      }
    }

    // 중복 피드백 체크
    const existing = await Feedback.findOne({ toSubmissionId, fromUid });
    if (existing) {
      return res
        .status(409)
        .json({ message: "이미 이 글에 피드백을 작성했습니다." });
    }

    // 피드백 저장
    const today = new Date().toISOString().slice(0, 10);
    const savedFeedback = await Feedback.create({
      fromUid,
      toSubmissionId,
      content,
      writtenDate: today,
      submissionTitle: targetSubmission.title,
    });

    // 오늘 작성한 피드백 수 확인
    const feedbackCount = await Feedback.countDocuments({
      fromUid,
      writtenDate: today,
    });

    // 피드백이 3개 이상이면 오늘 작성한 모든 글의 피드백 열람 가능
    if (feedbackCount >= config.FEEDBACK.REQUIRED_COUNT) {
      await Submission.updateMany(
        {
          "user.uid": fromUid,
          submissionDate: today,
        },
        {
          feedbackUnlocked: true,
        }
      );
    }

    res.json({
      message: "피드백이 성공적으로 저장되었습니다.",
      feedback: savedFeedback,
      unlocked: feedbackCount >= config.FEEDBACK.REQUIRED_COUNT,
      feedbackCount,
    });
  } catch (err) {
    console.error("❌ 피드백 저장 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
  }
});

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
  const limit = parseInt(req.query.limit) || 10;
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
        select: "text mode user createdAt title",
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
      title: sub.title,
      topic: sub.topic,
      text: sub.text,
      user: sub.user,
      createdAt: sub.createdAt,
      feedbackCount: countMap[sub._id.toString()] || 0,
      hasGivenFeedback: myFeedbackSet.has(sub._id.toString()),
      mode: sub.mode,
      submissionDate: sub.submissionDate,
    }));

    res.json(results);
  } catch (err) {
    console.error("❌ 전체 글 + 피드백 수 조회 실패:", err);
    res.status(500).json({ message: `서버 오류: ${err.message}` });
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

    // 내가 받은 피드백 수 (전체)
    const mySubmissionIds = submissions.map((s) => s._id);
    const feedbackReceived = await Feedback.countDocuments({
      toSubmissionId: { $in: mySubmissionIds },
    });

    // unlock 비율 계산
    const unlockRate =
      totalSubmissions === 0
        ? 0
        : Math.round((unlockedSubmissions / totalSubmissions) * 100);

    res.json({
      totalSubmissions,
      unlockedSubmissions,
      feedbackGiven,
      feedbackReceived, // 전체 피드백 수
      unlockRate,
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

module.exports = router;
