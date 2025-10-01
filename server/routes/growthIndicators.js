// server/routes/growthIndicators.js
const express = require("express");
const router = express.Router();
const UserProfile = require("../models/UserProfile");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

// 구체적 개선 지표 조회
router.get("/indicators/:userId", authenticateToken, async (req, res) => {
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

    const indicatorsData = analyzeWritingIndicators(filteredHistory, modeKey);

    res.json({
      hasData: true,
      data: indicatorsData,
      period,
      mode: modeKey,
    });
  } catch (error) {
    logger.error("❌ 구체적 개선 지표 조회 실패:", error);
    res.status(500).json({ message: "구체적 개선 지표를 불러올 수 없습니다." });
  }
});

// 글쓰기 지표 분석 함수
function analyzeWritingIndicators(history, mode) {
  if (history.length === 0) return null;

  const indicators = {
    summary: {
      totalWritings: history.length,
      averageScore: 0,
      scoreRange: { min: 0, max: 0 },
      improvementRate: 0,
    },
    detailedIndicators: [],
    averageIndicators: {},
    improvementTrends: {},
    improvementAreas: [],
    writingQuality: {},
  };

  // 각 글에 대한 상세 지표 분석
  history.forEach((item, index) => {
    const detailedIndicator = {
      date: item.date,
      title: item.title,
      score: item.score,
      indicators: {
        sentenceStructure: analyzeSentenceStructure(item.userText),
        vocabularyDiversity: analyzeVocabularyDiversity(item.userText),
        paragraphStructure: analyzeParagraphStructure(item.userText),
        expressiveness: analyzeExpressiveness(item.userText),
        endingQuality: analyzeEndingQuality(item.userText),
      },
    };

    indicators.detailedIndicators.push(detailedIndicator);
  });

  // 전체 평균 지표 계산
  indicators.summary.averageScore =
    history.reduce((sum, item) => sum + item.score, 0) / history.length;
  indicators.summary.scoreRange.min = Math.min(
    ...history.map((item) => item.score)
  );
  indicators.summary.scoreRange.max = Math.max(
    ...history.map((item) => item.score)
  );

  // 평균 지표 계산
  indicators.averageIndicators = calculateAverageIndicators(
    indicators.detailedIndicators
  );

  // 글쓰기 품질 계산
  indicators.writingQuality = {
    overall: indicators.summary.averageScore,
    consistency: calculateConsistency(indicators.detailedIndicators),
    improvement: indicators.summary.improvementRate,
    strengths: calculateStrengths(indicators.detailedIndicators),
    weaknesses: calculateWeaknesses(indicators.detailedIndicators),
  };

  // 개선률 계산
  if (history.length >= 2) {
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length;
    indicators.summary.improvementRate =
      ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  return indicators;
}

// 문장 구조 분석
function analyzeSentenceStructure(text) {
  if (!text || typeof text !== "string") {
    return { averageSentenceLength: 0, totalSentences: 0, longSentences: 0 };
  }

  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0)
    return { averageSentenceLength: 0, totalSentences: 0, longSentences: 0 };

  const sentenceLengths = sentences.map((s) => s.trim().length);
  return {
    averageSentenceLength:
      sentenceLengths.reduce((sum, len) => sum + len, 0) /
      sentenceLengths.length,
    totalSentences: sentences.length,
    longSentences: sentenceLengths.filter((len) => len > 50).length,
    shortSentences: sentenceLengths.filter((len) => len < 20).length,
  };
}

// 어휘 다양성 분석
function analyzeVocabularyDiversity(text) {
  if (!text || typeof text !== "string") {
    return { totalWords: 0, uniqueWords: 0, diversityRatio: 0 };
  }

  const words = text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0)
    return { totalWords: 0, uniqueWords: 0, diversityRatio: 0 };

  const uniqueWords = new Set(words);
  return {
    totalWords: words.length,
    uniqueWords: uniqueWords.size,
    diversityRatio: uniqueWords.size / words.length,
    advancedWords: words.filter((word) => word.length > 4).length,
  };
}

// 문단 구조 분석
function analyzeParagraphStructure(text) {
  if (!text || typeof text !== "string") {
    return {
      totalParagraphs: 0,
      averageParagraphLength: 0,
      singleSentenceParagraphs: 0,
    };
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0)
    return {
      totalParagraphs: 0,
      averageParagraphLength: 0,
      singleSentenceParagraphs: 0,
    };

  const paragraphLengths = paragraphs.map((p) => p.trim().length);
  return {
    totalParagraphs: paragraphs.length,
    averageParagraphLength:
      paragraphLengths.reduce((sum, len) => sum + len, 0) /
      paragraphLengths.length,
    singleSentenceParagraphs: paragraphs.filter(
      (p) => p.split(/[.!?]/).filter((s) => s.trim().length > 0).length === 1
    ).length,
  };
}

// 표현력 분석
function analyzeExpressiveness(text) {
  if (!text || typeof text !== "string") {
    return { descriptiveWords: 0, emotionalWords: 0, metaphorCount: 0 };
  }

  const descriptiveWords = [
    "아름다운",
    "멋진",
    "훌륭한",
    "놀라운",
    "감동적인",
    "생생한",
  ];
  const emotionalWords = [
    "기쁨",
    "슬픔",
    "화남",
    "놀람",
    "두려움",
    "사랑",
    "미움",
    "감사",
  ];
  const words = text.toLowerCase();

  return {
    descriptiveWords: descriptiveWords.filter((word) => words.includes(word))
      .length,
    emotionalWords: emotionalWords.filter((word) => words.includes(word))
      .length,
    metaphorCount: (text.match(/같다|처럼|마치|마냥/g) || []).length,
  };
}

// 끝맺음 품질 분석
function analyzeEndingQuality(text) {
  if (!text || typeof text !== "string") {
    return {
      endingLength: 0,
      endingType: "none",
      hasReflection: false,
      hasFutureVision: false,
    };
  }

  const lastSentence = text
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 0)
    .pop();
  if (!lastSentence)
    return {
      endingLength: 0,
      endingType: "none",
      hasReflection: false,
      hasFutureVision: false,
    };

  const ending = lastSentence.trim();
  const reflectionWords = [
    "깨달았다",
    "배웠다",
    "느꼈다",
    "생각했다",
    "이해했다",
  ];
  const futureWords = ["앞으로", "미래에", "다음에", "향후", "곧"];

  return {
    endingLength: ending.length,
    endingType: reflectionWords.some((word) => ending.includes(word))
      ? "reflection"
      : futureWords.some((word) => ending.includes(word))
      ? "future"
      : "none",
    hasReflection: reflectionWords.some((word) => ending.includes(word)),
    hasFutureVision: futureWords.some((word) => ending.includes(word)),
  };
}

// 평균 지표 계산 함수
function calculateAverageIndicators(detailedIndicators) {
  if (detailedIndicators.length === 0) return {};

  const allIndicators = detailedIndicators.map((item) => item.indicators);
  const averages = {};

  // 각 카테고리별 평균 계산
  Object.keys(allIndicators[0]).forEach((category) => {
    averages[category] = {};
    Object.keys(allIndicators[0][category]).forEach((indicator) => {
      const values = allIndicators.map(
        (item) => item[category][indicator] || 0
      );
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      averages[category][indicator] = Math.round(average * 100) / 100; // 소수점 2자리
    });
  });

  return averages;
}

// 일관성 계산 함수
function calculateConsistency(detailedIndicators) {
  if (detailedIndicators.length === 0) return 0;

  const scores = detailedIndicators.map((item) => item.score);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
    scores.length;
  const standardDeviation = Math.sqrt(variance);

  // 표준편차가 낮을수록 일관성이 높음 (100점 만점으로 변환)
  return Math.max(0, 100 - standardDeviation * 2);
}

// 강점 계산 함수
function calculateStrengths(detailedIndicators) {
  if (detailedIndicators.length === 0) return [];

  const strengths = [];
  const allIndicators = detailedIndicators.map((item) => item.indicators);

  // 각 지표별 평균 계산
  const averages = {};
  Object.keys(allIndicators[0]).forEach((category) => {
    averages[category] = {};
    Object.keys(allIndicators[0][category]).forEach((indicator) => {
      const values = allIndicators.map(
        (item) => item[category][indicator] || 0
      );
      averages[category][indicator] =
        values.reduce((sum, val) => sum + val, 0) / values.length;
    });
  });

  // 높은 점수의 지표들을 강점으로 분류
  Object.keys(averages).forEach((category) => {
    Object.keys(averages[category]).forEach((indicator) => {
      if (averages[category][indicator] > 70) {
        // 임계값 설정
        strengths.push({
          area: category,
          score: Math.round(averages[category][indicator]),
        });
      }
    });
  });

  return strengths.slice(0, 3); // 상위 3개만 반환
}

// 약점 계산 함수
function calculateWeaknesses(detailedIndicators) {
  if (detailedIndicators.length === 0) return [];

  const weaknesses = [];
  const allIndicators = detailedIndicators.map((item) => item.indicators);

  // 각 지표별 평균 계산
  const averages = {};
  Object.keys(allIndicators[0]).forEach((category) => {
    averages[category] = {};
    Object.keys(allIndicators[0][category]).forEach((indicator) => {
      const values = allIndicators.map(
        (item) => item[category][indicator] || 0
      );
      averages[category][indicator] =
        values.reduce((sum, val) => sum + val, 0) / values.length;
    });
  });

  // 낮은 점수의 지표들을 약점으로 분류
  Object.keys(averages).forEach((category) => {
    Object.keys(averages[category]).forEach((indicator) => {
      if (averages[category][indicator] < 50) {
        // 임계값 설정
        weaknesses.push({
          area: category,
          score: Math.round(averages[category][indicator]),
        });
      }
    });
  });

  return weaknesses.slice(0, 3); // 상위 3개만 반환
}

module.exports = router;
