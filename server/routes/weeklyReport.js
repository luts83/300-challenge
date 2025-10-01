// server/routes/weeklyReport.js
const express = require("express");
const router = express.Router();
const UserProfile = require("../models/UserProfile");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

// 주간 성장 리포트 생성
router.get("/generate/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { weekOffset = 0 } = req.query; // 0: 이번 주, 1: 지난 주, 2: 2주 전

    // 사용자 프로필 조회
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({ message: "사용자 프로필을 찾을 수 없습니다." });
    }

    // 주간 리포트 생성
    const weeklyReport = await generateWeeklyReport(profile, weekOffset);

    res.json({
      success: true,
      data: weeklyReport,
    });
  } catch (error) {
    logger.error("❌ 주간 성장 리포트 생성 실패:", error);
    res.status(500).json({ message: "주간 리포트를 생성할 수 없습니다." });
  }
});

// 주간 성장 리포트 생성 함수
async function generateWeeklyReport(profile, weekOffset) {
  const now = new Date();
  const targetWeek = new Date(
    now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000
  );

  // 해당 주의 시작일과 종료일 계산 (월요일 기준)
  const weekStart = new Date(targetWeek);
  const dayOfWeek = targetWeek.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 -6, 월요일이면 0
  weekStart.setDate(targetWeek.getDate() + daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // 일요일
  weekEnd.setHours(23, 59, 59, 999);

  const report = {
    weekInfo: {
      startDate: weekStart.toISOString().split("T")[0],
      endDate: weekEnd.toISOString().split("T")[0],
      weekOffset: parseInt(weekOffset),
      weekLabel: weekOffset == 0 ? "이번 주" : `${weekOffset}주 전`,
    },
    summary: {
      totalWritings: 0,
      mode300Writings: 0,
      mode1000Writings: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      improvementRate: 0,
    },
    dailyProgress: [],
    achievements: [],
    insights: {
      strengths: [],
      improvements: [],
      trends: {},
    },
    recommendations: [],
    nextWeekGoals: [],
  };

  // 300자 모드 데이터 분석
  const mode300History = profile.writingHistory.mode_300 || [];
  const mode300WeekData = mode300History.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= weekEnd;
  });

  // 1000자 모드 데이터 분석
  const mode1000History = profile.writingHistory.mode_1000 || [];
  const mode1000WeekData = mode1000History.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= weekEnd;
  });

  // 전체 주간 데이터
  const weekData = [...mode300WeekData, ...mode1000WeekData].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // 요약 통계 계산
  report.summary.totalWritings = weekData.length;
  report.summary.mode300Writings = mode300WeekData.length;
  report.summary.mode1000Writings = mode1000WeekData.length;

  if (weekData.length > 0) {
    const scores = weekData.map((item) => item.score);
    report.summary.averageScore =
      Math.round(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10
      ) / 10;
    report.summary.highestScore = Math.max(...scores);
    report.summary.lowestScore = Math.min(...scores);

    // 개선률 계산 (이전 주와 비교)
    if (weekOffset > 0) {
      const previousWeekData = await getPreviousWeekData(
        profile,
        weekOffset + 1
      );
      if (previousWeekData.length > 0) {
        const previousAvg =
          previousWeekData.reduce((sum, item) => sum + item.score, 0) /
          previousWeekData.length;
        report.summary.improvementRate =
          Math.round(
            ((report.summary.averageScore - previousAvg) / previousAvg) *
              100 *
              10
          ) / 10;
      }
    }
  }

  // 일별 진행률 분석
  report.dailyProgress = generateDailyProgress(weekStart, weekEnd, weekData);

  // 성취도 분석
  report.achievements = generateAchievements(weekData, report.summary);

  // 인사이트 생성
  report.insights = generateInsights(weekData, profile);

  // 추천사항 생성
  report.recommendations = generateRecommendations(
    report.insights,
    report.summary
  );

  // 다음 주 목표 설정
  report.nextWeekGoals = generateNextWeekGoals(report.insights, report.summary);

  return report;
}

// 이전 주 데이터 조회
async function getPreviousWeekData(profile, weekOffset) {
  const now = new Date();
  const targetWeek = new Date(
    now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000
  );

  const weekStart = new Date(targetWeek);
  weekStart.setDate(targetWeek.getDate() - targetWeek.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const mode300History = profile.writingHistory.mode_300 || [];
  const mode1000History = profile.writingHistory.mode_1000 || [];

  const mode300WeekData = mode300History.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= weekEnd;
  });

  const mode1000WeekData = mode1000History.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= weekEnd;
  });

  return [...mode300WeekData, ...mode1000WeekData];
}

// 일별 진행률 생성
function generateDailyProgress(weekStart, weekEnd, weekData) {
  const dailyProgress = [];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);

    const dayData = weekData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate.toDateString() === currentDay.toDateString();
    });

    dailyProgress.push({
      date: currentDay.toISOString().split("T")[0],
      dayOfWeek: ["일", "월", "화", "수", "목", "금", "토"][i],
      writings: dayData.length,
      averageScore:
        dayData.length > 0
          ? Math.round(
              (dayData.reduce((sum, item) => sum + item.score, 0) /
                dayData.length) *
                10
            ) / 10
          : 0,
      mode300Count: dayData.filter((item) => item.mode === "mode_300").length,
      mode1000Count: dayData.filter((item) => item.mode === "mode_1000").length,
    });
  }

  return dailyProgress;
}

// 성취도 생성
function generateAchievements(weekData, summary) {
  const achievements = [];

  // 글쓰기 횟수 관련 성취
  if (summary.totalWritings >= 7) {
    achievements.push({
      type: "frequency",
      title: "완벽한 일주일",
      description: "7일 모두 글을 작성했습니다!",
      icon: "🎯",
      level: "gold",
    });
  } else if (summary.totalWritings >= 5) {
    achievements.push({
      type: "frequency",
      title: "꾸준한 글쓰기",
      description: "5일 이상 글을 작성했습니다!",
      icon: "📝",
      level: "silver",
    });
  } else if (summary.totalWritings >= 3) {
    achievements.push({
      type: "frequency",
      title: "시작의 의미",
      description: "3일 이상 글을 작성했습니다!",
      icon: "🌱",
      level: "bronze",
    });
  }

  // 점수 관련 성취
  if (summary.averageScore >= 90) {
    achievements.push({
      type: "quality",
      title: "완벽한 글쓰기",
      description: "평균 90점 이상의 고품질 글을 작성했습니다!",
      icon: "⭐",
      level: "gold",
    });
  } else if (summary.averageScore >= 80) {
    achievements.push({
      type: "quality",
      title: "우수한 글쓰기",
      description: "평균 80점 이상의 좋은 글을 작성했습니다!",
      icon: "🌟",
      level: "silver",
    });
  } else if (summary.averageScore >= 70) {
    achievements.push({
      type: "quality",
      title: "안정적인 글쓰기",
      description: "평균 70점 이상의 안정적인 글을 작성했습니다!",
      icon: "💫",
      level: "bronze",
    });
  }

  // 개선 관련 성취
  if (summary.improvementRate >= 20) {
    achievements.push({
      type: "improvement",
      title: "급성장",
      description: "이전 주 대비 20% 이상 향상되었습니다!",
      icon: "🚀",
      level: "gold",
    });
  } else if (summary.improvementRate >= 10) {
    achievements.push({
      type: "improvement",
      title: "꾸준한 성장",
      description: "이전 주 대비 10% 이상 향상되었습니다!",
      icon: "📈",
      level: "silver",
    });
  }

  return achievements;
}

// 인사이트 생성
function generateInsights(weekData, profile) {
  const insights = {
    strengths: [],
    improvements: [],
    trends: {},
  };

  if (weekData.length === 0) {
    return insights;
  }

  // 영역별 점수 분석
  const areas = ["content", "expression", "structure", "impact"];
  const areaScores = {};

  areas.forEach((area) => {
    const scores = weekData.map((item) => item.criteria[area] || 0);
    if (scores.length > 0) {
      areaScores[area] =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
  });

  // 강점 분석
  const sortedAreas = Object.entries(areaScores).sort(([, a], [, b]) => b - a);
  if (sortedAreas.length > 0) {
    const [strongestArea, strongestScore] = sortedAreas[0];
    insights.strengths.push({
      area: getAreaName(strongestArea),
      score: Math.round(strongestScore * 10) / 10,
      description: `${getAreaName(strongestArea)} 영역에서 ${Math.round(
        strongestScore
      )}점의 우수한 성과를 보였습니다.`,
    });
  }

  // 개선점 분석
  if (sortedAreas.length > 1) {
    const [weakestArea, weakestScore] = sortedAreas[sortedAreas.length - 1];
    insights.improvements.push({
      area: getAreaName(weakestArea),
      score: Math.round(weakestScore * 10) / 10,
      description: `${getAreaName(
        weakestArea
      )} 영역에서 더 많은 개선이 필요합니다.`,
    });
  }

  // 트렌드 분석
  if (weekData.length >= 3) {
    const recentScores = weekData.slice(-3).map((item) => item.score);
    const isImproving =
      recentScores[0] < recentScores[1] && recentScores[1] < recentScores[2];
    const isDeclining =
      recentScores[0] > recentScores[1] && recentScores[1] > recentScores[2];

    insights.trends = {
      direction: isImproving
        ? "improving"
        : isDeclining
        ? "declining"
        : "stable",
      description: isImproving
        ? "최근 글쓰기 품질이 지속적으로 향상되고 있습니다."
        : isDeclining
        ? "최근 글쓰기 품질에 주의가 필요합니다."
        : "안정적인 글쓰기 품질을 유지하고 있습니다.",
    };
  }

  return insights;
}

// 추천사항 생성
function generateRecommendations(insights, summary) {
  const recommendations = [];

  // 빈도 관련 추천
  if (summary.totalWritings < 3) {
    recommendations.push({
      type: "frequency",
      title: "글쓰기 습관 만들기",
      description:
        "주 3회 이상 글쓰기를 목표로 하세요. 작은 목표부터 시작하는 것이 중요합니다.",
      priority: "high",
    });
  }

  // 품질 관련 추천
  if (summary.averageScore < 70) {
    recommendations.push({
      type: "quality",
      title: "글쓰기 품질 향상",
      description: "AI 피드백을 적극 활용하여 글쓰기 품질을 향상시켜보세요.",
      priority: "high",
    });
  }

  // 개선 영역 관련 추천
  if (insights.improvements.length > 0) {
    const improvement = insights.improvements[0];
    recommendations.push({
      type: "improvement",
      title: `${improvement.area} 영역 집중 연습`,
      description: `${improvement.area} 영역의 점수가 낮습니다. 이 영역에 집중해서 연습해보세요.`,
      priority: "medium",
    });
  }

  return recommendations;
}

// 다음 주 목표 생성
function generateNextWeekGoals(insights, summary) {
  const goals = [];

  // 빈도 목표
  if (summary.totalWritings < 7) {
    goals.push({
      type: "frequency",
      title: "글쓰기 빈도 늘리기",
      target: Math.min(summary.totalWritings + 2, 7),
      current: summary.totalWritings,
      description: "다음 주에는 더 자주 글을 작성해보세요.",
    });
  }

  // 품질 목표
  if (summary.averageScore < 80) {
    goals.push({
      type: "quality",
      title: "평균 점수 향상",
      target: Math.min(summary.averageScore + 5, 100),
      current: summary.averageScore,
      description: "다음 주에는 더 높은 품질의 글을 작성해보세요.",
    });
  }

  return goals;
}

// 영역명 변환 함수
function getAreaName(area) {
  const areaNames = {
    content: "내용",
    expression: "표현",
    structure: "구조",
    impact: "임팩트",
    originality: "독창성",
    consistency: "일관성",
    insight: "통찰력",
    development: "전개",
    technical: "기술",
  };
  return areaNames[area] || area;
}

module.exports = router;
