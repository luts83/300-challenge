// server/routes/growth.js
const express = require("express");
const router = express.Router();
const UserProfile = require("../models/UserProfile");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

// 성장 대시보드 데이터 조회
router.get("/dashboard/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { mode = "mode_300", period = "month" } = req.query;

    // 사용자 프로필 조회
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({ message: "사용자 프로필을 찾을 수 없습니다." });
    }

    const modeKey = mode === "mode_1000" ? "mode_1000" : "mode_300";
    const history = profile.writingHistory[modeKey] || [];

    if (history.length === 0) {
      return res.json({
        message: "아직 작성한 글이 없습니다.",
        hasData: false,
        data: null,
      });
    }

    // 기간별 데이터 필터링
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredHistory = history
      .filter((item) => new Date(item.date) >= startDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 성장 데이터 계산
    const growthData = calculateGrowthData(filteredHistory, modeKey);

    res.json({
      hasData: true,
      data: growthData,
      period,
      mode: modeKey,
    });
  } catch (error) {
    logger.error("❌ 성장 대시보드 조회 실패:", error);
    res.status(500).json({ message: "성장 데이터를 불러올 수 없습니다." });
  }
});

// 영역별 성장 추이 조회
router.get("/areas/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { mode = "mode_300", period = "month" } = req.query;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({ message: "사용자 프로필을 찾을 수 없습니다." });
    }

    const modeKey = mode === "mode_1000" ? "mode_1000" : "mode_300";
    const history = profile.writingHistory[modeKey] || [];

    if (history.length === 0) {
      return res.json({
        message: "아직 작성한 글이 없습니다.",
        hasData: false,
        data: null,
      });
    }

    // 기간별 데이터 필터링
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredHistory = history
      .filter((item) => new Date(item.date) >= startDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 영역별 성장 데이터 계산
    const areaGrowthData = calculateAreaGrowthData(filteredHistory, modeKey);

    res.json({
      hasData: true,
      data: areaGrowthData,
      period,
      mode: modeKey,
    });
  } catch (error) {
    logger.error("❌ 영역별 성장 추이 조회 실패:", error);
    res
      .status(500)
      .json({ message: "영역별 성장 데이터를 불러올 수 없습니다." });
  }
});

// 성장 데이터 계산 함수
function calculateGrowthData(history, mode) {
  if (history.length === 0) return null;

  // 기본 통계
  const totalWritings = history.length;
  const averageScore =
    history.reduce((sum, item) => sum + item.score, 0) / totalWritings;
  const highestScore = Math.max(...history.map((item) => item.score));
  const lowestScore = Math.min(...history.map((item) => item.score));

  // 점수 변화 추이
  const scoreTrend = history.map((item) => ({
    date: item.date,
    score: item.score,
    title: item.title,
  }));

  // 성장률 계산 (최근 3개 vs 이전 3개)
  let growthRate = 0;
  if (history.length >= 6) {
    const recent3 = history.slice(-3);
    const previous3 = history.slice(-6, -3);
    const recentAvg = recent3.reduce((sum, item) => sum + item.score, 0) / 3;
    const previousAvg =
      previous3.reduce((sum, item) => sum + item.score, 0) / 3;
    growthRate = ((recentAvg - previousAvg) / previousAvg) * 100;
  }

  // 성장 트렌드 분석
  let trend = "stable";
  if (history.length >= 3) {
    const recentScores = history.slice(-3).map((item) => item.score);
    const isIncreasing =
      recentScores[0] < recentScores[1] && recentScores[1] < recentScores[2];
    const isDecreasing =
      recentScores[0] > recentScores[1] && recentScores[1] > recentScores[2];

    if (isIncreasing) trend = "improving";
    else if (isDecreasing) trend = "declining";
  }

  // 주간/월간 집계
  const weeklyData = aggregateByWeek(history);
  const monthlyData = aggregateByMonth(history);

  return {
    summary: {
      totalWritings,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      lowestScore,
      growthRate: Math.round(growthRate * 10) / 10,
      trend,
    },
    scoreTrend,
    weeklyData,
    monthlyData,
  };
}

// 영역별 성장 데이터 계산 함수
function calculateAreaGrowthData(history, mode) {
  if (history.length === 0) return null;

  // 영역별 정의
  const areas =
    mode === "mode_300"
      ? ["content", "expression", "structure", "impact"]
      : [
          "content",
          "expression",
          "structure",
          "originality",
          "consistency",
          "insight",
          "development",
          "technical",
        ];

  // 영역별 점수 추이
  const areaTrends = {};
  areas.forEach((area) => {
    areaTrends[area] = history.map((item) => ({
      date: item.date,
      score: item.criteria[area] || 0,
      title: item.title,
    }));
  });

  // 영역별 평균 점수
  const areaAverages = {};
  areas.forEach((area) => {
    const scores = history.map((item) => item.criteria[area] || 0);
    areaAverages[area] =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  // 영역별 성장률
  const areaGrowthRates = {};
  areas.forEach((area) => {
    if (history.length >= 6) {
      const recent3 = history.slice(-3);
      const previous3 = history.slice(-6, -3);
      const recentAvg =
        recent3.reduce((sum, item) => sum + (item.criteria[area] || 0), 0) / 3;
      const previousAvg =
        previous3.reduce((sum, item) => sum + (item.criteria[area] || 0), 0) /
        3;
      areaGrowthRates[area] = ((recentAvg - previousAvg) / previousAvg) * 100;
    } else {
      areaGrowthRates[area] = 0;
    }
  });

  // 가장 많이 개선된 영역
  const mostImprovedArea = Object.keys(areaGrowthRates).reduce((a, b) =>
    areaGrowthRates[a] > areaGrowthRates[b] ? a : b
  );

  // 가장 개선이 필요한 영역 (평균 점수가 가장 낮은 영역)
  const needsImprovementArea = Object.keys(areaAverages).reduce((a, b) =>
    areaAverages[a] < areaAverages[b] ? a : b
  );

  return {
    areas: {
      trends: areaTrends,
      averages: areaAverages,
      growthRates: areaGrowthRates,
    },
    insights: {
      mostImprovedArea,
      needsImprovementArea,
      strongestArea: Object.keys(areaAverages).reduce((a, b) =>
        areaAverages[a] > areaAverages[b] ? a : b
      ),
    },
  };
}

// 주간 집계 함수 (월요일 기준)
function aggregateByWeek(history) {
  const weeklyData = {};

  history.forEach((item) => {
    const date = new Date(item.date);
    const weekStart = new Date(date);
    const dayOfWeek = date.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 -6, 월요일이면 0
    weekStart.setDate(date.getDate() + daysToMonday);
    const weekKey = weekStart.toISOString().split("T")[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekStart: weekKey,
        writings: [],
        averageScore: 0,
        totalWritings: 0,
      };
    }

    weeklyData[weekKey].writings.push(item);
    weeklyData[weekKey].totalWritings++;
  });

  // 주간 평균 점수 계산
  Object.keys(weeklyData).forEach((weekKey) => {
    const week = weeklyData[weekKey];
    const totalScore = week.writings.reduce((sum, item) => sum + item.score, 0);
    week.averageScore = Math.round((totalScore / week.totalWritings) * 10) / 10;
  });

  return Object.values(weeklyData).sort(
    (a, b) => new Date(a.weekStart) - new Date(b.weekStart)
  );
}

// 월간 집계 함수
function aggregateByMonth(history) {
  const monthlyData = {};

  history.forEach((item) => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        writings: [],
        averageScore: 0,
        totalWritings: 0,
      };
    }

    monthlyData[monthKey].writings.push(item);
    monthlyData[monthKey].totalWritings++;
  });

  // 월간 평균 점수 계산
  Object.keys(monthlyData).forEach((monthKey) => {
    const month = monthlyData[monthKey];
    const totalScore = month.writings.reduce(
      (sum, item) => sum + item.score,
      0
    );
    month.averageScore =
      Math.round((totalScore / month.totalWritings) * 10) / 10;
  });

  return Object.values(monthlyData).sort(
    (a, b) => new Date(a.month) - new Date(b.month)
  );
}

module.exports = router;
