//server/routes/dashboard.js
const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Feedback = require("../models/Feedback");
const UserProfile = require("../models/UserProfile");
const { startOfDay } = require("date-fns");
const {
  userListCache,
  userStatsCache,
  overallStatsCache,
} = require("../utils/cache");
const getManualTopicByDate = require("../utils/getManualTopicByDate");
const getTodayAIBasedTopic = require("../utils/getTodayAIBasedTopic");

// 모든 사용자 목록 조회 (페이지네이션 지원)
router.get("/stats/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // 기본 100명씩 (성능 향상)
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // 캐시에서 먼저 확인
    const cachedData = userListCache.get(page, limit, search);
    if (cachedData) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `📦 캐시에서 사용자 목록 반환 (페이지: ${page}, 검색: "${search}")`
        );
      }
      return res.json(cachedData);
    }

    // 검색 조건
    const matchCondition = search
      ? {
          $or: [
            { "user.email": { $regex: search, $options: "i" } },
            { "user.displayName": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, totalCount] = await Promise.all([
      Submission.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$user.uid",
            displayName: { $first: "$user.displayName" },
            email: { $first: "$user.email" },
            submissionCount: { $sum: 1 },
            lastSubmission: { $max: "$createdAt" },
          },
        },
        {
          $project: {
            uid: "$_id",
            displayName: 1,
            email: 1,
            submissionCount: 1,
            lastSubmission: 1,
            _id: 0,
          },
        },
        {
          $sort: { submissionCount: -1, lastSubmission: -1 },
        },
        { $skip: skip },
        { $limit: limit },
      ]),
      Submission.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$user.uid",
          },
        },
        {
          $count: "total",
        },
      ]),
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    const result = {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    // 결과를 캐시에 저장 (순수 객체로 변환)
    const cacheData = JSON.parse(JSON.stringify(result));
    userListCache.set(page, limit, search, cacheData);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `💾 사용자 목록 캐시 저장 (페이지: ${page}, 검색: "${search}")`
      );
    }

    res.json(result);
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "사용자 목록을 불러오는데 실패했습니다." });
  }
});

// 사용자의 통계 정보 조회
router.get("/stats/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 캐시에서 먼저 확인
    const cachedStats = userStatsCache.get(uid);
    if (cachedStats) {
      if (process.env.NODE_ENV === "development") {
        console.log(`📦 캐시에서 사용자 통계 반환 (UID: ${uid})`);
      }
      return res.json(cachedStats);
    }

    // 사용자 로컬 기준 오늘 날짜 계산 (기본: Asia/Seoul)
    const timezone = req.query.timezone || "Asia/Seoul";
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const [submissions, feedbacks, todaySubmissions, userProfile] =
      await Promise.all([
        Submission.find({ "user.uid": uid }).select("score createdAt").lean(),
        Feedback.find({ fromUid: uid }).select("_id").lean(),
        Submission.find({ "user.uid": uid, submissionDate: todayStr })
          .select("_id")
          .lean(),
        UserProfile.findOne({ userId: uid })
          .select("user.email user.displayName writingStats")
          .lean(),
      ]);

    const totalSubmissions = submissions.length;
    const averageScore =
      totalSubmissions > 0
        ? submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) /
          totalSubmissions
        : 0;

    const result = {
      totalSubmissions,
      averageScore: Math.round(averageScore * 10) / 10,
      totalFeedbacks: feedbacks.length,
      submissionsToday: todaySubmissions.length,
      userProfile: userProfile
        ? {
            email: userProfile.user?.email,
            displayName: userProfile.user?.displayName,
            writingStats: userProfile.writingStats,
          }
        : null,
    };

    // 결과를 캐시에 저장 (순수 객체로 변환)
    const cacheData = JSON.parse(JSON.stringify(result));
    userStatsCache.set(uid, cacheData);
    if (process.env.NODE_ENV === "development") {
      console.log(`💾 사용자 통계 캐시 저장 (UID: ${uid})`);
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "사용자 통계를 불러오는데 실패했습니다." });
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

// 모든 제출물과 피드백 조회 (최적화)
router.get("/all-submissions/:uid", async (req, res) => {
  try {
    const { start, end, page = 1, limit = 50 } = req.query; // 페이지네이션 추가
    const targetUid = req.params.uid;
    const includeAll =
      String(req.query.adminView) === "true" ||
      String(req.query.includeAll) === "true";
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const match = includeAll ? {} : { "user.uid": targetUid };
    if (start && end) {
      match.submissionDate = {
        $gte: start,
        $lte: end,
      };
    }

    // 1. 제출물 조회 (페이지네이션 적용) - lean()으로 성능 향상
    const submissions = await Submission.find(match)
      .select(
        "_id title text user mode sessionCount duration createdAt topic score aiFeedback userTimezone userTimezoneOffset"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // lean()으로 성능 향상

    // 2. 피드백 조회 (배치 처리) - lean()으로 성능 향상
    const submissionIds = submissions.map((sub) => sub._id);
    const allFeedbacks = await Feedback.find({
      toSubmissionId: { $in: submissionIds },
    })
      .select("_id toSubmissionId content createdAt fromUid fromUser")
      .lean();

    // 3. 피드백 작성자 정보 조회 (fallback 로직 포함)
    const feedbackWriterUids = [...new Set(allFeedbacks.map((f) => f.fromUid))];
    const User = require("../models/User"); // User 모델 import

    const feedbackWriters = await User.find({
      uid: { $in: feedbackWriterUids },
    })
      .select("uid displayName email")
      .lean();

    const writerMap = {};
    feedbackWriters.forEach((writer) => {
      writerMap[writer.uid] = {
        displayName: writer.displayName || "익명",
        email: writer.email || "알 수 없음",
      };
    });

    // 4. 데이터 조합 (메모리 효율적으로)
    const submissionsWithFeedback = submissions.map((sub) => {
      const feedbacks = allFeedbacks
        .filter((fb) => fb.toSubmissionId.toString() === sub._id.toString())
        .map((fb) => {
          // 피드백 작성자 정보는 항상 최신 User 모델에서 가져오기
          let fromUserInfo;

          if (writerMap[fb.fromUid]) {
            // User 모델에서 조회한 최신 정보 사용 (우선순위 1)
            fromUserInfo = writerMap[fb.fromUid];
          } else {
            // User 모델에서 정보를 찾을 수 없는 경우 (계정 삭제 등)
            // 이 경우에만 Feedback.fromUser 사용
            if (fb.fromUser && fb.fromUser.displayName) {
              fromUserInfo = {
                displayName: fb.fromUser.displayName,
                email: fb.fromUser.email || "알 수 없음",
              };
            } else {
              // 모든 정보가 없는 경우
              fromUserInfo = { displayName: "익명", email: "알 수 없음" };
            }
          }

          return {
            _id: fb._id,
            content: fb.content,
            createdAt: fb.createdAt,
            fromUser: fromUserInfo,
          };
        });

      return {
        ...sub,
        feedbacks,
        feedbackCount: feedbacks.length,
      };
    });

    // 5. 총 개수 조회 (페이지네이션용)
    const totalCount = await Submission.countDocuments(match);

    res.json({
      submissions: submissionsWithFeedback,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasMore: parseInt(page) * parseInt(limit) < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "제출물 목록을 불러오는데 실패했습니다." });
  }
});

// 랭킹 정보 조회
router.get("/rankings", async (req, res) => {
  try {
    const { start, end } = req.query;

    // 날짜/조건 필터 설정
    const match = {};
    if (start && end) {
      match.submissionDate = {
        $gte: start,
        $lte: end,
      };
    }

    // 날짜 필터가 적용된 제출물 가져오기
    const submissions = await Submission.find(match);

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

    // 피드백 랭킹 계산 - 제출물 기준 범위 내에서만 집계
    const submissionIds = submissions.map((s) => s._id);
    const feedbacks = await Feedback.find({
      toSubmissionId: { $in: submissionIds },
    });

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

    const match = {};
    if (start && end) {
      match.submissionDate = {
        $gte: start,
        $lte: end,
      };
    }

    const submissions = await Submission.find(match);
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

    // 날짜 필터 설정 (submissionDate 사용)
    const match = {};
    if (start && end) {
      match.submissionDate = {
        $gte: start,
        $lte: end,
      };
    }

    // 날짜 필터가 적용된 제출물 가져오기
    const submissions = await Submission.find(match).sort({
      createdAt: -1,
    });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching weekly data:", error);
    res.status(500).json({ error: "주간 데이터를 불러오는데 실패했습니다." });
  }
});

// 주제별 랭킹 조회 (페이지네이션 지원)
router.get("/rankings/topics", async (req, res) => {
  try {
    const {
      start,
      end,
      page = 1,
      limit = 50,
      search = "",
      mode = "",
    } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let matchCondition = {};

    if (start && end) {
      matchCondition.submissionDate = {
        $gte: start,
        $lte: end,
      };
    }

    // 검색 조건 추가
    if (search) {
      matchCondition.topic = { $regex: search, $options: "i" };
    }

    // 모드 필터 추가
    if (mode && mode !== "all") {
      matchCondition.mode = mode;
    }

    // 전체 개수 조회 (모드별 구분)
    const totalCount = await Submission.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            topic: "$topic",
            mode: "$mode",
          },
        },
      },
      {
        $count: "total",
      },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / limitNum);

    // 주제별 랭킹 조회 (페이지네이션 적용)
    const topicRanking = await Submission.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            topic: "$topic",
            mode: "$mode",
          },
          submissionCount: { $sum: 1 },
          averageScore: { $avg: "$score" },
          uniqueUsers: { $addToSet: "$user.uid" },
          lastSubmission: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          topic: "$_id.topic",
          mode: "$_id.mode",
          submissionCount: 1,
          averageScore: {
            $round: [{ $ifNull: ["$averageScore", 0] }, 1],
          },
          uniqueUsers: { $size: "$uniqueUsers" },
          lastSubmission: 1,
          _id: 0,
        },
      },
      { $sort: { submissionCount: -1, averageScore: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    res.json({
      topicRanking,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
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
    const { topic, isManualTopic } = getManualTopicByDate(
      "300",
      req.query.timezone || "Asia/Seoul",
      Number(req.query.offset) || 540,
      targetDate
    );

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
    // submissionDate 기준으로 날짜 목록 가져오기
    const dates = await Submission.distinct("submissionDate");
    dates.sort();

    res.json({ dates });
  } catch (error) {
    console.error("Error fetching submission dates:", error);
    res
      .status(500)
      .json({ error: "작성 날짜 목록을 불러오는데 실패했습니다." });
  }
});

module.exports = router;
