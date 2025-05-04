const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const { startOfDay } = require("date-fns");

// 모든 사용자 목록 조회 (제출물이 있는 사용자만)
// 이 라우트를 맨 위로 이동하고 경로를 /users에서 /stats/users로 변경
router.get("/stats/users", async (req, res) => {
  try {
    // 제출물이 있는 고유한 사용자 목록 조회
    const users = await Submission.aggregate([
      {
        $group: {
          _id: "$user.uid",
          displayName: { $first: "$user.displayName" },
          email: { $first: "$user.email" },
          submissionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          uid: "$_id",
          displayName: 1,
          email: 1,
          submissionCount: 1,
          _id: 0,
        },
      },
      {
        $sort: { submissionCount: -1 },
      },
    ]);

    res.json(users);
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "사용자 목록을 불러오는데 실패했습니다." });
  }
});

// 사용자의 통계 정보 조회
router.get("/stats/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const today = startOfDay(new Date());

    const [submissions, feedbacks, todaySubmissions] = await Promise.all([
      Submission.find({ "user.uid": uid }),
      Feedback.find({ fromUid: uid }),
      Submission.find({
        "user.uid": uid,
        createdAt: { $gte: today },
      }),
    ]);

    const totalScore = submissions.reduce(
      (sum, sub) => sum + (sub.score || 0),
      0
    );
    const averageScore =
      submissions.length > 0 ? totalScore / submissions.length : 0;

    res.json({
      totalSubmissions: submissions.length,
      averageScore,
      totalFeedbacks: feedbacks.length,
      submissionsToday: todaySubmissions.length,
    });
  } catch (error) {
    res.status(500).json({ error: "통계 정보를 불러오는데 실패했습니다." });
  }
});

// 모든 제출물과 피드백 정보 조회
router.get("/all", async (req, res) => {
  try {
    // 모든 제출물과 피드백 정보를 한 번에 가져오기
    const submissions = await Submission.find({}).sort({ createdAt: -1 });

    const feedbacks = await Feedback.find({});

    // 제출물에 피드백 매핑
    const submissionsWithFeedback = submissions.map((sub) => {
      const subFeedbacks = feedbacks.filter(
        (fb) => fb.toSubmissionId === sub._id.toString()
      );
      return {
        ...sub.toObject(),
        feedbacks: subFeedbacks,
      };
    });

    res.json(submissionsWithFeedback);
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ error: "데이터를 불러오는데 실패했습니다." });
  }
});

// 모든 제출물과 피드백 조회
router.get("/all-submissions/:uid", async (req, res) => {
  try {
    // 1. 모든 제출물 가져오기
    const submissions = await Submission.find()
      .select(
        "_id title text user mode sessionCount duration createdAt topic score ai_feedback"
      ) // ai_feedback 필드도 추가
      .sort({ createdAt: -1 });

    console.log("서버에서 조회된 제출물:", submissions[0]); // 첫 번째 제출물 데이터 확인용 로그

    // 2. 각 제출물의 피드백 가져오기
    const submissionIds = submissions.map((sub) => sub._id);
    const allFeedbacks = await Feedback.find({
      toSubmissionId: { $in: submissionIds },
    });

    // 3. 피드백 작성자 정보 가져오기
    const feedbackWriterUids = [...new Set(allFeedbacks.map((f) => f.fromUid))];
    const feedbackWriters = await Submission.find({
      "user.uid": { $in: feedbackWriterUids },
    }).select("user");

    // 4. 작성자 정보 매핑
    const writerMap = {};
    feedbackWriters.forEach((writer) => {
      writerMap[writer.user.uid] = writer.user;
    });

    // 5. 제출물에 피드백 매핑
    const submissionsWithFeedback = submissions.map((sub) => {
      const feedbacks = allFeedbacks
        .filter((fb) => fb.toSubmissionId.toString() === sub._id.toString())
        .map((fb) => ({
          _id: fb._id,
          content: fb.content,
          createdAt: fb.createdAt,
          fromUser: writerMap[fb.fromUid] || { displayName: "익명" },
        }));

      const submissionObj = sub.toObject();
      submissionObj.feedbacks = feedbacks;
      submissionObj.feedbackCount = feedbacks.length;

      return submissionObj;
    });

    res.json(submissionsWithFeedback);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "제출물 목록을 불러오는데 실패했습니다." });
  }
});

// 랭킹 정보 조회
router.get("/rankings", async (req, res) => {
  try {
    // 모든 제출물 가져오기
    const submissions = await Submission.find();

    // 점수 데이터 확인을 위한 로그
    console.log("\n=== 점수 데이터 확인 ===");
    submissions.forEach((sub) => {
      console.log({
        title: sub.title,
        mode: sub.mode,
        score: sub.score,
        user: {
          displayName: sub.user.displayName,
          uid: sub.user.uid,
        },
      });
    });

    // score 필드가 있는 제출물만 필터링
    const validSubmissions = submissions.filter(
      (sub) =>
        sub.score !== undefined && sub.score !== null && !isNaN(sub.score)
    );

    // 유저별, 모드별 점수 집계
    const userScores = validSubmissions.reduce((acc, sub) => {
      if (!sub.user || !sub.user.uid) return acc;

      const uid = sub.user.uid;
      const mode = sub.mode;

      if (!acc[uid]) {
        acc[uid] = {
          user: sub.user,
          mode_300: { total: 0, count: 0 },
          mode_1000: { total: 0, count: 0 },
        };
      }

      if (mode === "mode_300") {
        acc[uid].mode_300.total += Number(sub.score);
        acc[uid].mode_300.count += 1;
      } else if (mode === "mode_1000") {
        acc[uid].mode_1000.total += Number(sub.score);
        acc[uid].mode_1000.count += 1;
      }

      return acc;
    }, {});

    // 랭킹 계산
    const mode300Rankings = Object.values(userScores)
      .filter((user) => user.mode_300.count > 0)
      .map((user) => ({
        user: user.user,
        score: Math.round(user.mode_300.total / user.mode_300.count),
        submissionCount: user.mode_300.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const mode1000Rankings = Object.values(userScores)
      .filter((user) => user.mode_1000.count > 0)
      .map((user) => ({
        user: user.user,
        score: Math.round(user.mode_1000.total / user.mode_1000.count),
        submissionCount: user.mode_1000.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 피드백 랭킹 계산 부분 수정
    const feedbacks = await Feedback.find();

    // 받은 피드백 수 집계
    const receivedFeedbackCounts = {};
    feedbacks.forEach((fb) => {
      const submission = submissions.find(
        (sub) => sub._id.toString() === fb.toSubmissionId?.toString()
      );
      if (submission) {
        const uid = submission.user.uid;
        if (!receivedFeedbackCounts[uid]) {
          receivedFeedbackCounts[uid] = {
            user: submission.user,
            feedbackCount: 0,
          };
        }
        receivedFeedbackCounts[uid].feedbackCount += 1;
      }
    });

    // 작성한 피드백 수 집계
    const givenFeedbackCounts = {};
    feedbacks.forEach((fb) => {
      const uid = fb.fromUid;
      if (!givenFeedbackCounts[uid]) {
        // 피드백 작성자 정보 찾기
        const userSubmission = submissions.find((sub) => sub.user.uid === uid);
        if (userSubmission) {
          givenFeedbackCounts[uid] = {
            user: userSubmission.user,
            feedbackCount: 0,
          };
        }
      }
      if (givenFeedbackCounts[uid]) {
        givenFeedbackCounts[uid].feedbackCount += 1;
      }
    });

    // 랭킹 정렬
    const receivedFeedbackRanking = Object.values(receivedFeedbackCounts)
      .filter((item) => item.user)
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 5);

    const givenFeedbackRanking = Object.values(givenFeedbackCounts)
      .filter((item) => item.user)
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 5);

    // 좋아요 랭킹 계산
    const likeCounts = {};

    submissions.forEach((submission) => {
      (submission.likedUsers || []).forEach((user) => {
        const uid = user.uid;
        if (!likeCounts[uid]) {
          likeCounts[uid] = {
            user: user,
            likeCount: 0,
          };
        }
        likeCounts[uid].likeCount += 1;
      });
    });

    const likeRanking = Object.values(likeCounts)
      .filter((item) => item.user)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);

    console.log("유저별 좋아요 랭킹:", likeRanking);

    // 최종 응답
    res.json({
      scoreRanking: {
        mode300: mode300Rankings,
        mode1000: mode1000Rankings,
      },
      feedbackRanking: {
        received: receivedFeedbackRanking,
        given: givenFeedbackRanking,
      },
      likeRanking: likeRanking,
    });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    res.status(500).json({ error: "랭킹 정보를 불러오는데 실패했습니다." });
  }
});

module.exports = router;
