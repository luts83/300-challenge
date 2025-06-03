//server/routes/dashboard.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const { startOfDay } = require("date-fns");

// 모든 사용자 목록 조회
router.get("/stats/users", async (req, res) => {
  try {
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
    const { start, end } = req.query;
    const targetUid = req.params.uid;

    const dateFilter = {};
    if (start && end) {
      dateFilter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const submissions = await Submission.find(dateFilter)
      .select(
        "_id title text user mode sessionCount duration createdAt topic score ai_feedback"
      )
      .sort({ createdAt: -1 });

    const submissionIds = submissions.map((sub) => sub._id);
    const allFeedbacks = await Feedback.find({
      toSubmissionId: { $in: submissionIds },
    });

    const feedbackWriterUids = [...new Set(allFeedbacks.map((f) => f.fromUid))];
    const feedbackWriters = await Submission.find({
      "user.uid": { $in: feedbackWriterUids },
    }).select("user");

    const writerMap = {};
    feedbackWriters.forEach((writer) => {
      writerMap[writer.user.uid] = writer.user;
    });

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
    const { start, end } = req.query;

    // 날짜 필터 설정
    const dateFilter = {};
    if (start && end) {
      dateFilter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    // 날짜 필터가 적용된 제출물 가져오기
    const submissions = await Submission.find(dateFilter);

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

    // 피드백 랭킹 계산 - 수정된 부분
    const feedbacks = await Feedback.find({
      ...(dateFilter.createdAt && { createdAt: dateFilter.createdAt }),
    });

    // 받은 피드백 수 집계 - 수정된 부분
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

    // 작성한 피드백 수 집계 - 수정된 부분
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

    // 좋아요 랭킹 계산 - 수정된 부분
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

// 좋아요 많이 받은 사람 랭킹 - 수정된 부분
router.get("/rankings/likes-received", async (req, res) => {
  try {
    const { start, end } = req.query;
    const dateFilter = {};

    if (start && end) {
      dateFilter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const submissions = await Submission.find(dateFilter);
    const likeReceivedCounts = {};

    submissions.forEach((submission) => {
      const uid = submission.user.uid;
      const user = submission.user;

      // 좋아요 수 계산 시 시간 정보 확인
      const likeCount =
        submission.likedUsers?.reduce((count, like) => {
          // likedAt이 있는 경우 (새로운 데이터)
          if (like.likedAt) {
            const likedDate = new Date(like.likedAt);
            if (start && end) {
              const startDate = new Date(`${start}T00:00:00.000Z`);
              const endDate = new Date(`${end}T23:59:59.999Z`);
              if (likedDate >= startDate && likedDate <= endDate) {
                return count + 1;
              }
            } else {
              return count + 1;
            }
          }
          // likedAt이 없는 경우 (기존 데이터)
          return count + 1;
        }, 0) || 0;

      if (!likeReceivedCounts[uid]) {
        likeReceivedCounts[uid] = {
          user,
          likeCount: 0,
        };
      }

      likeReceivedCounts[uid].likeCount += likeCount;
    });

    const likeReceivedRanking = Object.values(likeReceivedCounts)
      .filter((item) => item.user)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);

    res.json({ likeReceivedRanking });
  } catch (error) {
    console.error("좋아요 받은 랭킹 조회 실패:", error);
    res
      .status(500)
      .json({ error: "좋아요 받은 랭킹을 불러오는 데 실패했습니다." });
  }
});

// 주간 통계 조회
router.get("/weekly", async (req, res) => {
  try {
    const { start, end } = req.query;

    // 날짜 필터 설정
    const dateFilter = {};
    if (start && end) {
      dateFilter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    // 날짜 필터가 적용된 제출물 가져오기
    const submissions = await Submission.find(dateFilter).sort({
      createdAt: -1,
    });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching weekly data:", error);
    res.status(500).json({ error: "주간 데이터를 불러오는데 실패했습니다." });
  }
});

// 주제별 랭킹 조회
router.get("/rankings/topics", async (req, res) => {
  try {
    const { start, end } = req.query;

    const dateFilter = {};
    if (start && end) {
      dateFilter.createdAt = {
        $gte: new Date(`${start}T00:00:00.000Z`),
        $lte: new Date(`${end}T23:59:59.999Z`),
      };
    }

    const submissions = await Submission.find(dateFilter).sort({
      createdAt: 1,
    });

    const topicStats = {};

    submissions.forEach((sub) => {
      if (!sub.topic) return;

      if (!topicStats[sub.topic]) {
        topicStats[sub.topic] = {
          topic: sub.topic,
          count: 0,
          totalScore: 0,
          mode: sub.mode,
          dates: new Set(),
        };
      }

      topicStats[sub.topic].count += 1;
      topicStats[sub.topic].totalScore += sub.score || 0;
      topicStats[sub.topic].dates.add(
        sub.createdAt.toISOString().split("T")[0]
      );
    });

    const topicRanking = Object.values(topicStats)
      .map((topic) => ({
        topic: topic.topic,
        count: topic.count,
        averageScore: Math.round(topic.totalScore / topic.count),
        mode: topic.mode,
        dates: Array.from(topic.dates).sort(),
      }))
      .sort((a, b) => b.count - a.count);

    res.json({ topicRanking });
  } catch (error) {
    console.error("Error fetching topic rankings:", error);
    res.status(500).json({ error: "주제 랭킹을 불러오는데 실패했습니다." });
  }
});

// 특정 날짜의 주제 조회
router.get("/topic/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 수동 주제 가져오기
    const { topic, isManualTopic } = getManualTopicByDate("300", targetDate);

    if (isManualTopic) {
      return res.json({
        topic,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isManualTopic: true,
      });
    }

    // 수동 주제가 없는 경우 AI 주제 생성
    const aiTopic = await getTodayAIBasedTopic();
    return res.json({
      topic: aiTopic.topic_300,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isManualTopic: false,
      writing_tips: aiTopic.writing_tips,
    });
  } catch (error) {
    console.error("Error fetching topic:", error);
    res.status(500).json({ error: "주제를 불러오는데 실패했습니다." });
  }
});

// 작성된 날짜 목록 조회 API 수정
router.get("/submission-dates", async (req, res) => {
  try {
    const submissions = await Submission.find()
      .select("createdAt")
      .sort({ createdAt: 1 });

    const dates = [
      ...new Set(
        submissions.map(
          (sub) => new Date(sub.createdAt).toISOString().split("T")[0]
        )
      ),
    ];

    res.json({ dates });
  } catch (error) {
    console.error("Error fetching submission dates:", error);
    res
      .status(500)
      .json({ error: "작성 날짜 목록을 불러오는데 실패했습니다." });
  }
});

module.exports = router;
