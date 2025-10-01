// server/routes/feedbackTracking.js
const express = require("express");
const router = express.Router();
const UserProfile = require("../models/UserProfile");
const Feedback = require("../models/Feedback");
const Submission = require("../models/Submission");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

// 피드백 적용 여부 추적 데이터 조회
router.get("/application/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { mode = "mode_300", period = "month" } = req.query;

    logger.info(
      `🔍 피드백 적용 추적 조회 시작: userId=${userId}, mode=${mode}, period=${period}`
    );

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      logger.warn(`❌ 사용자 프로필을 찾을 수 없습니다: userId=${userId}`);
      return res
        .status(404)
        .json({ message: "사용자 프로필을 찾을 수 없습니다." });
    }

    const modeKey = mode === "mode_1000" ? "mode_1000" : "mode_300";
    const history = profile.writingHistory[modeKey] || [];

    logger.info(
      `📊 사용자 프로필 데이터 상태: userId=${userId}, mode=${modeKey}, historyLength=${history.length}`
    );

    if (history.length === 0) {
      logger.info(`📝 작성한 글이 없음: userId=${userId}, mode=${modeKey}`);
      return res.json({
        message: "아직 작성한 글이 없습니다.",
        hasData: false,
        data: null,
        debug: {
          userId,
          mode: modeKey,
          historyLength: history.length,
          profileExists: !!profile,
        },
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

    logger.info(
      `📅 기간 필터링 결과: userId=${userId}, originalLength=${
        history.length
      }, filteredLength=${
        filteredHistory.length
      }, startDate=${startDate.toISOString()}`
    );

    if (filteredHistory.length === 0) {
      logger.info(
        `📅 선택한 기간에 작성한 글이 없음: userId=${userId}, period=${period}`
      );
      return res.json({
        message: `선택한 기간(${period})에 작성한 글이 없습니다.`,
        hasData: false,
        data: null,
        debug: {
          userId,
          mode: modeKey,
          period,
          originalHistoryLength: history.length,
          filteredHistoryLength: filteredHistory.length,
          startDate: startDate.toISOString(),
        },
      });
    }

    // AI 평가 데이터 기반 인사이트 분석
    const feedbacks = await getFeedbacksForWritings(userId, filteredHistory);
    logger.info(
      `💬 피드백 데이터 조회 결과: userId=${userId}, feedbacksLength=${feedbacks.length}`
    );

    // 피드백이 없으면 데이터 없음으로 처리
    if (feedbacks.length === 0) {
      logger.info(`❌ 피드백이 없음: userId=${userId}, mode=${modeKey}`);
      return res.json({
        message: "AI 피드백이 있는 글이 없습니다.",
        hasData: false,
        data: null,
        debug: {
          userId,
          mode: modeKey,
          period,
          originalHistoryLength: history.length,
          filteredHistoryLength: filteredHistory.length,
          feedbacksLength: feedbacks.length,
          startDate: startDate.toISOString(),
        },
      });
    }

    const applicationData = await analyzeFeedbackApplication(
      userId,
      filteredHistory,
      modeKey
    );

    // applicationData가 null이면 데이터 없음으로 처리
    if (!applicationData) {
      logger.info(`❌ 피드백 적용 분석 결과 없음: userId=${userId}`);
      return res.json({
        message: "피드백 적용 분석을 할 수 없습니다.",
        hasData: false,
        data: null,
        debug: {
          userId,
          mode: modeKey,
          period,
          originalHistoryLength: history.length,
          filteredHistoryLength: filteredHistory.length,
          feedbacksLength: feedbacks.length,
          startDate: startDate.toISOString(),
        },
      });
    }

    const insights = analyzeAIEvaluationInsights(feedbacks);

    logger.info(
      `✅ 피드백 적용 추적 데이터 생성 완료: userId=${userId}, hasData=${!!applicationData}`
    );

    res.json({
      hasData: true,
      data: {
        ...applicationData,
        insights: insights,
      },
      period,
      mode: modeKey,
      debug: {
        userId,
        mode: modeKey,
        period,
        originalHistoryLength: history.length,
        filteredHistoryLength: filteredHistory.length,
        feedbacksLength: feedbacks.length,
        startDate: startDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error("❌ 피드백 적용 여부 추적 조회 실패:", error);
    res
      .status(500)
      .json({ message: "피드백 적용 데이터를 불러올 수 없습니다." });
  }
});

// 피드백 적용 여부 분석 함수
async function analyzeFeedbackApplication(userId, history, mode) {
  if (history.length === 0) {
    logger.warn(`❌ 분석할 글 히스토리가 없음: userId=${userId}`);
    return null;
  }

  logger.info(
    `🔍 피드백 적용 분석 시작: userId=${userId}, historyLength=${history.length}`
  );

  // 각 글에 대한 피드백 조회
  const feedbacks = await getFeedbacksForWritings(userId, history);

  if (feedbacks.length === 0) {
    logger.warn(`❌ 분석할 피드백이 없음: userId=${userId}`);
    return null;
  }

  // 피드백 적용 분석
  const applicationAnalysis = await analyzeSingleFeedbackApplication(
    history,
    feedbacks
  );

  logger.info(
    `📊 피드백 적용 분석 완료: userId=${userId}, analysisLength=${applicationAnalysis.length}`
  );

  // 전체 적용 점수 계산
  const applicationScore = calculateApplicationScore(applicationAnalysis);

  // 반복 이슈 분석
  const repeatedIssues = analyzeRepeatedIssues(feedbacks);

  // 개선 트렌드 분석
  const improvementTrend = analyzeApplicationTrend(applicationAnalysis);

  // 적용 트렌드 데이터 생성 (클라이언트에서 기대하는 형식)
  const applicationTrend = applicationAnalysis.map((item, index) => ({
    index: index,
    applicationScore: item.applicationScore,
    isApplied: item.applicationScore > 0,
    date: item.date,
    writingTitle: item.writingTitle,
    writingScore: item.score,
    appliedSuggestions: item.appliedSuggestions || [],
    ignoredSuggestions: item.ignoredSuggestions || [],
    hasFeedback: item.hasFeedback,
  }));

  const result = {
    summary: {
      totalWritings: history.length,
      totalFeedbacks: feedbacks.length,
      appliedFeedbacks: applicationAnalysis.filter(
        (item) => item.applicationScore > 0
      ).length,
      applicationRate:
        feedbacks.length > 0
          ? Math.round(
              (applicationAnalysis.filter((item) => item.applicationScore > 0)
                .length /
                feedbacks.length) *
                100
            )
          : 0,
      averageApplicationScore: applicationScore,
      improvementTrend,
    },
    applicationAnalysis,
    applicationTrend,
    repeatedIssues,
    insights: {
      mostAppliedFeedback: getMostAppliedFeedback(applicationAnalysis),
      leastAppliedFeedback: getLeastAppliedFeedback(applicationAnalysis),
      improvementAreas: analyzeImprovementAreas(applicationAnalysis),
    },
  };

  logger.info(
    `✅ 피드백 적용 분석 결과: userId=${userId}, summary=${JSON.stringify(
      result.summary
    )}`
  );

  return result;
}

// 글에 대한 피드백 조회
async function getFeedbacksForWritings(userId, history) {
  const feedbacks = [];

  logger.info(
    `🔍 피드백 조회 시작: userId=${userId}, historyLength=${history.length}`
  );

  for (const writing of history) {
    try {
      logger.info(
        `📝 글 조회 중: submissionId=${writing.submissionId}, title=${writing.title}`
      );

      // submissions에서 직접 aiFeedback 가져오기
      const submission = await Submission.findOne({
        _id: writing.submissionId,
        "user.uid": userId,
      });

      if (submission) {
        logger.info(
          `✅ Submission 찾음: submissionId=${
            writing.submissionId
          }, hasAiFeedback=${!!submission.aiFeedback}`
        );

        if (submission.aiFeedback) {
          try {
            const aiFeedback = JSON.parse(submission.aiFeedback);
            feedbacks.push({
              toSubmissionId: writing.submissionId,
              content: aiFeedback,
              writingDate: writing.date,
              writingScore: writing.score,
              writingTitle: writing.title,
            });
            logger.info(
              `✅ 피드백 파싱 성공: submissionId=${writing.submissionId}`
            );
          } catch (parseError) {
            logger.warn(
              `⚠️ 피드백 파싱 실패: submissionId=${writing.submissionId}`,
              parseError
            );
          }
        } else {
          logger.warn(
            `⚠️ AI 피드백 없음: submissionId=${writing.submissionId}`
          );
        }
      } else {
        logger.warn(
          `⚠️ Submission 찾을 수 없음: submissionId=${writing.submissionId}`
        );
      }
    } catch (error) {
      logger.error(
        `❌ 피드백 조회 실패: submissionId=${writing.submissionId}`,
        error
      );
    }
  }

  logger.info(
    `📊 피드백 조회 완료: userId=${userId}, totalFeedbacks=${feedbacks.length}`
  );
  return feedbacks;
}

// 개별 피드백 적용 분석
async function analyzeSingleFeedbackApplication(history, feedbacks) {
  const analysis = [];

  for (let i = 0; i < history.length; i++) {
    const currentWriting = history[i];
    const feedback = feedbacks.find(
      (f) => f.toSubmissionId === currentWriting.submissionId
    );

    if (!feedback) {
      analysis.push({
        writingId: currentWriting.submissionId,
        writingTitle: currentWriting.title,
        writingDate: currentWriting.date,
        date: currentWriting.date,
        score: currentWriting.score,
        hasFeedback: false,
        applicationScore: 0,
        appliedSuggestions: [],
        ignoredSuggestions: [],
      });
      continue;
    }

    // 다음 글과 비교하여 피드백 적용 여부 분석
    let applicationScore = 0;
    const appliedSuggestions = [];
    const ignoredSuggestions = [];

    if (i < history.length - 1) {
      const nextWriting = history[i + 1];
      const applicationResult = analyzeFeedbackApplicationBetweenWritings(
        feedback,
        currentWriting,
        nextWriting
      );
      applicationScore = applicationResult.score;
      appliedSuggestions.push(...applicationResult.applied);
      ignoredSuggestions.push(...applicationResult.ignored);
    }

    analysis.push({
      writingId: currentWriting.submissionId,
      writingTitle: currentWriting.title,
      writingDate: currentWriting.date,
      date: currentWriting.date,
      score: currentWriting.score,
      hasFeedback: true,
      applicationScore,
      appliedSuggestions,
      ignoredSuggestions,
      feedbackContent: feedback.content,
    });
  }

  return analysis;
}

// AI 평가 데이터 기반 인사이트 분석
function analyzeAIEvaluationInsights(feedbacks) {
  const insights = {
    strengths: [],
    weaknesses: [],
    improvementAreas: [],
    writingTips: [],
    scoreTrends: [],
    categoryAnalysis: {
      content: { scores: [], feedbacks: [] },
      expression: { scores: [], feedbacks: [] },
      structure: { scores: [], feedbacks: [] },
      impact: { scores: [], feedbacks: [] },
    },
  };

  feedbacks.forEach((feedback, index) => {
    if (!feedback.content || typeof feedback.content !== "object") return;

    // 1. 강점 분석 (strengths)
    if (
      feedback.content.strengths &&
      Array.isArray(feedback.content.strengths)
    ) {
      feedback.content.strengths.forEach((strength) => {
        insights.strengths.push({
          content: strength,
          frequency: 1,
          category: categorizeStrength(strength),
          writingDate: feedback.writingDate,
          score: feedback.writingScore,
          submissionId: feedback.toSubmissionId,
          writingTitle: feedback.writingTitle || "제목 없음",
        });
      });
    }

    // 2. 개선점 분석 (improvements)
    if (
      feedback.content.improvements &&
      Array.isArray(feedback.content.improvements)
    ) {
      feedback.content.improvements.forEach((improvement) => {
        insights.weaknesses.push({
          content: improvement,
          frequency: 1,
          category: categorizeImprovement(improvement),
          writingDate: feedback.writingDate,
          score: feedback.writingScore,
          submissionId: feedback.toSubmissionId,
          writingTitle: feedback.writingTitle || "제목 없음",
        });
      });
    }

    // 3. 글쓰기 팁 분석
    if (feedback.content.writing_tips) {
      insights.writingTips.push({
        content: feedback.content.writing_tips,
        writingDate: feedback.writingDate,
        score: feedback.writingScore,
        submissionId: feedback.toSubmissionId,
        writingTitle: feedback.writingTitle || "제목 없음",
      });
    }

    // 4. 카테고리별 점수 분석
    if (feedback.content.criteria_scores) {
      Object.entries(feedback.content.criteria_scores).forEach(
        ([category, data]) => {
          if (insights.categoryAnalysis[category]) {
            insights.categoryAnalysis[category].scores.push(data.score);
            insights.categoryAnalysis[category].feedbacks.push({
              score: data.score,
              feedback: data.feedback,
              writingDate: feedback.writingDate,
            });
          }
        }
      );
    }

    // 5. 전체 점수 트렌드
    if (feedback.content.overall_score) {
      insights.scoreTrends.push({
        score: feedback.content.overall_score,
        writingDate: feedback.writingDate,
      });
    }
  });

  // 카테고리별 대표 강점 선택
  insights.strengths = selectRepresentativeStrengths(insights.strengths);
  insights.weaknesses = analyzeFrequency(insights.weaknesses);
  insights.improvementAreas = generateImprovementAreas(insights.weaknesses);
  insights.writingTips = insights.writingTips.slice(-3); // 최근 3개만

  return insights;
}

// 강점 카테고리 분류
function categorizeStrength(strength) {
  const text = strength.toLowerCase();
  if (text.includes("구조") || text.includes("문단") || text.includes("흐름"))
    return "structure";
  if (text.includes("표현") || text.includes("어휘") || text.includes("문장"))
    return "expression";
  if (text.includes("내용") || text.includes("주제") || text.includes("이야기"))
    return "content";
  if (text.includes("감정") || text.includes("묘사") || text.includes("생생"))
    return "emotion";
  return "general";
}

// 개선점 카테고리 분류
function categorizeImprovement(improvement) {
  const text = improvement.toLowerCase();
  if (text.includes("구조") || text.includes("문단")) return "structure";
  if (text.includes("표현") || text.includes("어휘") || text.includes("문장"))
    return "expression";
  if (text.includes("내용") || text.includes("주제") || text.includes("이야기"))
    return "content";
  if (text.includes("문법") || text.includes("맞춤법") || text.includes("오타"))
    return "technical";
  return "general";
}

// 두 글 사이의 피드백 적용 분석 (AI 피드백 데이터 기반)
function analyzeFeedbackApplicationBetweenWritings(
  feedback,
  currentWriting,
  nextWriting
) {
  const applied = [];
  const ignored = [];
  let score = 0;

  if (!feedback.content || typeof feedback.content !== "object") {
    return { applied, ignored, score: 0 };
  }

  // 1. improvements 배열 분석
  if (
    feedback.content.improvements &&
    Array.isArray(feedback.content.improvements)
  ) {
    feedback.content.improvements.forEach((improvement, index) => {
      if (typeof improvement === "string") {
        const isApplied = checkImprovementApplication(
          improvement,
          currentWriting,
          nextWriting
        );

        if (isApplied) {
          applied.push({
            type: "improvement",
            description: improvement,
            category: categorizeImprovement(improvement),
          });
          score += 25; // 각 적용된 개선점당 25점
        } else {
          ignored.push({
            type: "improvement",
            description: improvement,
            category: categorizeImprovement(improvement),
          });
        }
      }
    });
  }

  // 2. writing_tips 분석
  if (
    feedback.content.writing_tips &&
    typeof feedback.content.writing_tips === "string"
  ) {
    const tips = feedback.content.writing_tips;
    const isApplied = checkTipsApplication(tips, currentWriting, nextWriting);

    if (isApplied) {
      applied.push({
        type: "tip",
        description: tips,
        category: "writing_tips",
      });
      score += 15; // 팁 적용시 15점
    } else {
      ignored.push({
        type: "tip",
        description: tips,
        category: "writing_tips",
      });
    }
  }

  return {
    score: Math.min(score, 100),
    applied,
    ignored,
  };
}

// 개선점 적용 여부 확인 (구체적 매칭 버전)
function checkImprovementApplication(improvement, currentWriting, nextWriting) {
  if (!currentWriting.userText || !nextWriting.userText) return false;

  const currentText = currentWriting.userText.toLowerCase();
  const nextText = nextWriting.userText.toLowerCase();
  const improvementText = improvement.toLowerCase();

  // 1. 구체적인 피드백-적용 매칭 분석 (우선순위 1)
  const specificMatch = analyzeSpecificFeedbackApplication(
    improvement,
    currentText,
    nextText
  );
  if (specificMatch.isApplied) {
    logger.info(
      `✅ 구체적 피드백 적용 확인: ${improvement} -> ${specificMatch.evidence}`
    );
    return true;
  }

  // 2. 텍스트 유사도 기반 개선 확인
  const similarityImprovement = analyzeTextSimilarityImprovement(
    improvement,
    currentText,
    nextText
  );
  if (similarityImprovement.isApplied) {
    logger.info(
      `✅ 유사도 기반 개선 확인: ${improvement} -> ${similarityImprovement.evidence}`
    );
    return true;
  }

  // 3. 구조적 개선 확인 (점수 기반 제거)
  const structuralImprovement = analyzeStructuralImprovement(
    improvement,
    currentText,
    nextText
  );
  if (structuralImprovement.isApplied) {
    logger.info(
      `✅ 구조적 개선 확인: ${improvement} -> ${structuralImprovement.evidence}`
    );
    return true;
  }

  return false;
}

// 팁 적용 여부 확인 (개선된 버전)
function checkTipsApplication(tips, currentWriting, nextWriting) {
  if (!currentWriting.userText || !nextWriting.userText) return false;

  const currentText = currentWriting.userText.toLowerCase();
  const nextText = nextWriting.userText.toLowerCase();
  const tipsText = tips.toLowerCase();

  // 1. 점수 기반 개선 확인
  if (nextWriting.score > currentWriting.score) {
    return true;
  }

  // 2. 구체적인 팁 키워드 매칭
  const tipKeywords = {
    문장: ["문장", "호흡", "길이", "간결"],
    표현: ["구체", "생생", "감각", "묘사"],
    구조: ["문단", "흐름", "논리", "순서"],
    어휘: ["어휘", "단어", "표현력", "다양"],
  };

  // 팁 내용에서 키워드 추출하여 다음 글에서 개선 확인
  for (const [category, keywords] of Object.entries(tipKeywords)) {
    if (tipsText.includes(category)) {
      for (const keyword of keywords) {
        if (nextText.includes(keyword) && !currentText.includes(keyword)) {
          return true;
        }
      }
    }
  }

  // 3. Before/After 패턴이 있는 경우 구체적 개선 확인
  if (tipsText.includes("before:") && tipsText.includes("after:")) {
    // Before/After 예시가 실제로 적용되었는지 확인
    const beforeMatch = tipsText.match(/before:\s*([^-]+?)\s*after:/);
    const afterMatch = tipsText.match(/after:\s*([^-]+?)(?:\s*$|\s*-)/);

    if (beforeMatch && afterMatch) {
      const beforePattern = beforeMatch[1].trim().toLowerCase();
      const afterPattern = afterMatch[1].trim().toLowerCase();

      // 다음 글에서 After 패턴이 더 많이 나타나면 개선으로 판단
      const beforeCount = (
        nextText.match(
          new RegExp(beforePattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        ) || []
      ).length;
      const afterCount = (
        nextText.match(
          new RegExp(afterPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        ) || []
      ).length;

      if (afterCount > beforeCount) {
        return true;
      }
    }
  }

  return false;
}

// 카테고리별 대표 강점 선택
function selectRepresentativeStrengths(strengths) {
  const categoryMap = {};

  // 카테고리별로 그룹화
  strengths.forEach((strength) => {
    if (!categoryMap[strength.category]) {
      categoryMap[strength.category] = [];
    }
    categoryMap[strength.category].push(strength);
  });

  // 각 카테고리에서 대표 강점 선택 (점수 높은 순, 최신 순)
  const representativeStrengths = [];

  Object.entries(categoryMap).forEach(([category, categoryStrengths]) => {
    // 점수 높은 순으로 정렬, 같으면 최신 순
    const sorted = categoryStrengths.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.writingDate) - new Date(a.writingDate);
    });

    // 각 카테고리에서 최대 1개씩 선택
    representativeStrengths.push(sorted[0]);
  });

  // 전체에서 상위 3개만 반환
  return representativeStrengths.sort((a, b) => b.score - a.score).slice(0, 3);
}

// 빈도 분석
function analyzeFrequency(items) {
  const frequencyMap = {};

  items.forEach((item) => {
    const key = item.content.substring(0, 50); // 처음 50자로 그룹화
    if (frequencyMap[key]) {
      frequencyMap[key].frequency++;
      frequencyMap[key].scores.push(item.score);
    } else {
      frequencyMap[key] = { ...item, scores: [item.score] };
    }
  });

  return Object.values(frequencyMap)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5); // 상위 5개만
}

// 개선 영역 생성
function generateImprovementAreas(weaknesses) {
  const areas = {};

  weaknesses.forEach((weakness) => {
    if (areas[weakness.category]) {
      areas[weakness.category].count++;
      areas[weakness.category].examples.push({
        content: weakness.content,
        submissionId: weakness.submissionId,
        writingTitle: weakness.writingTitle,
        writingDate: weakness.writingDate,
        score: weakness.score,
      });
    } else {
      areas[weakness.category] = {
        category: weakness.category,
        count: 1,
        examples: [
          {
            content: weakness.content,
            submissionId: weakness.submissionId,
            writingTitle: weakness.writingTitle,
            writingDate: weakness.writingDate,
            score: weakness.score,
          },
        ],
        priority: getPriority(weakness.category),
        // 가장 최근의 weakness 정보를 대표로 사용
        submissionId: weakness.submissionId,
        writingTitle: weakness.writingTitle,
        writingDate: weakness.writingDate,
        score: weakness.score,
      };
    }
  });

  return Object.values(areas)
    .sort((a, b) => b.count - a.count)
    .map((area) => ({
      ...area,
      examples: area.examples.slice(0, 2), // 최대 2개 예시만
    }));
}

// 우선순위 설정
function getPriority(category) {
  const priorities = {
    structure: "high",
    expression: "high",
    content: "medium",
    emotion: "medium",
    general: "low",
  };
  return priorities[category] || "low";
}

// 개선점 적용 여부 확인 (개선된 버전)
function checkImprovementApplication(improvement, currentWriting, nextWriting) {
  if (!currentWriting.userText || !nextWriting.userText) return false;

  const currentText = currentWriting.userText.toLowerCase();
  const nextText = nextWriting.userText.toLowerCase();
  const improvementText = improvement.toLowerCase();

  // 1. 점수 기반 개선 확인 (가장 신뢰할 만한 지표)
  if (nextWriting.score > currentWriting.score) {
    return true;
  }

  // 2. 구체적인 개선점 키워드 매칭
  const improvementKeywords = {
    구조: ["문단", "흐름", "논리", "순서", "구성"],
    표현: ["어휘", "문장", "표현력", "생생", "구체"],
    내용: ["깊이", "성찰", "이야기", "경험", "감정"],
    문법: ["맞춤법", "문법", "오타", "띄어쓰기"],
  };

  // 개선점 카테고리별 키워드 확인
  for (const [category, keywords] of Object.entries(improvementKeywords)) {
    if (improvementText.includes(category)) {
      for (const keyword of keywords) {
        if (nextText.includes(keyword) && !currentText.includes(keyword)) {
          return true;
        }
      }
    }
  }

  // 3. 텍스트 구조 개선 확인
  const currentSentences = currentText
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 0).length;
  const nextSentences = nextText
    .split(/[.!?]/)
    .filter((s) => s.trim().length > 0).length;

  // 문장 수가 증가하고 평균 문장 길이가 적절해졌다면 개선
  if (nextSentences > currentSentences) {
    const currentAvgLength = currentText.length / currentSentences;
    const nextAvgLength = nextText.length / nextSentences;

    // 문장이 더 다양해졌다면 개선으로 판단
    if (
      nextAvgLength > currentAvgLength * 0.8 &&
      nextAvgLength < currentAvgLength * 1.5
    ) {
      return true;
    }
  }

  // 4. 문단 구조 개선 확인
  const currentParagraphs = currentText
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;
  const nextParagraphs = nextText
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;

  if (nextParagraphs > currentParagraphs && improvementText.includes("구조")) {
    return true;
  }

  return false;
}

// 팁 적용 여부 확인 (개선된 버전)
function checkTipsApplication(tips, currentWriting, nextWriting) {
  if (!currentWriting.userText || !nextWriting.userText) return false;

  const currentText = currentWriting.userText.toLowerCase();
  const nextText = nextWriting.userText.toLowerCase();
  const tipsText = tips.toLowerCase();

  // 1. 점수 기반 개선 확인
  if (nextWriting.score > currentWriting.score) {
    return true;
  }

  // 2. 구체적인 팁 키워드 매칭
  const tipKeywords = {
    문장: ["문장", "호흡", "길이", "간결"],
    표현: ["구체", "생생", "감각", "묘사"],
    구조: ["문단", "흐름", "논리", "순서"],
    어휘: ["어휘", "단어", "표현력", "다양"],
  };

  // 팁 내용에서 키워드 추출하여 다음 글에서 개선 확인
  for (const [category, keywords] of Object.entries(tipKeywords)) {
    if (tipsText.includes(category)) {
      for (const keyword of keywords) {
        if (nextText.includes(keyword) && !currentText.includes(keyword)) {
          return true;
        }
      }
    }
  }

  // 3. Before/After 패턴이 있는 경우 구체적 개선 확인
  if (tipsText.includes("before:") && tipsText.includes("after:")) {
    // Before/After 예시가 실제로 적용되었는지 확인
    const beforeMatch = tipsText.match(/before:\s*([^-]+?)\s*after:/);
    const afterMatch = tipsText.match(/after:\s*([^-]+?)(?:\s*$|\s*-)/);

    if (beforeMatch && afterMatch) {
      const beforePattern = beforeMatch[1].trim().toLowerCase();
      const afterPattern = afterMatch[1].trim().toLowerCase();

      // 다음 글에서 After 패턴이 더 많이 나타나면 개선으로 판단
      const beforeCount = (
        nextText.match(
          new RegExp(beforePattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        ) || []
      ).length;
      const afterCount = (
        nextText.match(
          new RegExp(afterPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        ) || []
      ).length;

      if (afterCount > beforeCount) {
        return true;
      }
    }
  }

  return false;
}

// AI 피드백에서 키워드 추출 (실제 데이터 구조 기반)
function extractKeywords(feedbackContent) {
  const keywords = [];

  if (!feedbackContent || typeof feedbackContent !== "object") {
    return keywords;
  }

  // 1. strengths 분석
  if (feedbackContent.strengths && Array.isArray(feedbackContent.strengths)) {
    feedbackContent.strengths.forEach((strength) => {
      if (typeof strength === "string") {
        if (strength.includes("구조") || strength.includes("문단")) {
          keywords.push({
            type: "structure",
            description: "구조 강점",
            isStrength: true,
          });
        }
        if (
          strength.includes("표현") ||
          strength.includes("어휘") ||
          strength.includes("문장")
        ) {
          keywords.push({
            type: "expression",
            description: "표현 강점",
            isStrength: true,
          });
        }
        if (
          strength.includes("내용") ||
          strength.includes("주제") ||
          strength.includes("이야기")
        ) {
          keywords.push({
            type: "content",
            description: "내용 강점",
            isStrength: true,
          });
        }
      }
    });
  }

  // 2. improvements 분석
  if (
    feedbackContent.improvements &&
    Array.isArray(feedbackContent.improvements)
  ) {
    feedbackContent.improvements.forEach((improvement) => {
      if (typeof improvement === "string") {
        if (improvement.includes("구조") || improvement.includes("문단")) {
          keywords.push({
            type: "structure",
            description: "구조 개선",
            isStrength: false,
          });
        }
        if (
          improvement.includes("표현") ||
          improvement.includes("어휘") ||
          improvement.includes("문장")
        ) {
          keywords.push({
            type: "expression",
            description: "표현 개선",
            isStrength: false,
          });
        }
        if (
          improvement.includes("내용") ||
          improvement.includes("주제") ||
          improvement.includes("이야기")
        ) {
          keywords.push({
            type: "content",
            description: "내용 개선",
            isStrength: false,
          });
        }
        if (
          improvement.includes("문법") ||
          improvement.includes("맞춤법") ||
          improvement.includes("오타")
        ) {
          keywords.push({
            type: "technical",
            description: "기술적 개선",
            isStrength: false,
          });
        }
      }
    });
  }

  // 3. writing_tips 분석
  if (
    feedbackContent.writing_tips &&
    typeof feedbackContent.writing_tips === "string"
  ) {
    const tips = feedbackContent.writing_tips;
    if (tips.includes("구조") || tips.includes("문단")) {
      keywords.push({
        type: "structure",
        description: "구조 팁",
        isStrength: false,
      });
    }
    if (
      tips.includes("표현") ||
      tips.includes("어휘") ||
      tips.includes("문장")
    ) {
      keywords.push({
        type: "expression",
        description: "표현 팁",
        isStrength: false,
      });
    }
    if (
      tips.includes("내용") ||
      tips.includes("주제") ||
      tips.includes("이야기")
    ) {
      keywords.push({
        type: "content",
        description: "내용 팁",
        isStrength: false,
      });
    }
  }

  return keywords;
}

// 개선 지표 분석
function analyzeImprovementIndicators(currentWriting, nextWriting) {
  const improvements = [];

  // 점수 개선
  if (nextWriting.score > currentWriting.score) {
    improvements.push({
      type: "score",
      improved: true,
      improvement: nextWriting.score - currentWriting.score,
    });
  }

  // 영역별 개선 분석
  const currentCriteria = currentWriting.criteria || {};
  const nextCriteria = nextWriting.criteria || {};

  Object.keys(nextCriteria).forEach((area) => {
    if (nextCriteria[area] > (currentCriteria[area] || 0)) {
      improvements.push({
        type: area,
        improved: true,
        improvement: nextCriteria[area] - (currentCriteria[area] || 0),
      });
    }
  });

  return improvements;
}

// 전체 적용 점수 계산
function calculateApplicationScore(applicationAnalysis) {
  if (applicationAnalysis.length === 0) return 0;

  const totalScore = applicationAnalysis.reduce(
    (sum, item) => sum + item.applicationScore,
    0
  );
  return totalScore / applicationAnalysis.length;
}

// 반복 이슈 분석
function analyzeRepeatedIssues(feedbacks) {
  const issueCounts = {};

  feedbacks.forEach((feedback) => {
    const mainIssue = extractMainIssue(feedback.content);
    if (mainIssue) {
      issueCounts[mainIssue] = (issueCounts[mainIssue] || 0) + 1;
    }
  });

  return Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

// 주요 이슈 추출 (AI 피드백 데이터 구조 기반)
function extractMainIssue(feedbackContent) {
  if (!feedbackContent || typeof feedbackContent !== "object") {
    return "기타 문제";
  }

  // improvements 배열에서 가장 빈번한 문제 찾기
  if (
    feedbackContent.improvements &&
    Array.isArray(feedbackContent.improvements)
  ) {
    const improvements = feedbackContent.improvements.join(" ");

    if (improvements.includes("구조") || improvements.includes("문단")) {
      return "구조 문제";
    }
    if (
      improvements.includes("표현") ||
      improvements.includes("어휘") ||
      improvements.includes("문장")
    ) {
      return "표현 문제";
    }
    if (
      improvements.includes("내용") ||
      improvements.includes("주제") ||
      improvements.includes("이야기")
    ) {
      return "내용 문제";
    }
    if (
      improvements.includes("문법") ||
      improvements.includes("맞춤법") ||
      improvements.includes("오타")
    ) {
      return "문법 문제";
    }
  }

  // writing_tips에서도 확인
  if (
    feedbackContent.writing_tips &&
    typeof feedbackContent.writing_tips === "string"
  ) {
    const tips = feedbackContent.writing_tips;

    if (tips.includes("구조") || tips.includes("문단")) {
      return "구조 문제";
    }
    if (
      tips.includes("표현") ||
      tips.includes("어휘") ||
      tips.includes("문장")
    ) {
      return "표현 문제";
    }
    if (
      tips.includes("내용") ||
      tips.includes("주제") ||
      tips.includes("이야기")
    ) {
      return "내용 문제";
    }
    if (
      tips.includes("문법") ||
      tips.includes("맞춤법") ||
      tips.includes("오타")
    ) {
      return "문법 문제";
    }
  }

  return "기타 문제";
}

// 적용 트렌드 분석
function analyzeApplicationTrend(applicationAnalysis) {
  if (applicationAnalysis.length < 3) return "stable";

  const recentScores = applicationAnalysis
    .slice(-3)
    .map((item) => item.applicationScore);
  const isImproving =
    recentScores[0] < recentScores[1] && recentScores[1] < recentScores[2];
  const isDeclining =
    recentScores[0] > recentScores[1] && recentScores[1] > recentScores[2];

  return isImproving ? "improving" : isDeclining ? "declining" : "stable";
}

// 가장 많이 적용된 피드백
function getMostAppliedFeedback(applicationAnalysis) {
  const appliedCounts = {};

  applicationAnalysis.forEach((item) => {
    item.appliedSuggestions.forEach((suggestion) => {
      appliedCounts[suggestion.type] =
        (appliedCounts[suggestion.type] || 0) + 1;
    });
  });

  const mostApplied = Object.entries(appliedCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  return mostApplied ? { type: mostApplied[0], count: mostApplied[1] } : null;
}

// 가장 적게 적용된 피드백
function getLeastAppliedFeedback(applicationAnalysis) {
  const ignoredCounts = {};

  applicationAnalysis.forEach((item) => {
    item.ignoredSuggestions.forEach((suggestion) => {
      ignoredCounts[suggestion.type] =
        (ignoredCounts[suggestion.type] || 0) + 1;
    });
  });

  const leastApplied = Object.entries(ignoredCounts).sort(
    ([, a], [, b]) => a - b
  )[0];

  return leastApplied
    ? { type: leastApplied[0], count: leastApplied[1] }
    : null;
}

// 개선 영역 분석
function analyzeImprovementAreas(applicationAnalysis) {
  const areas = ["structure", "expression", "content", "technical"];
  const areaScores = {};

  areas.forEach((area) => {
    const areaAnalysis = applicationAnalysis.filter((item) =>
      item.appliedSuggestions.some((suggestion) => suggestion.type === area)
    );
    areaScores[area] = areaAnalysis.length;
  });

  return Object.entries(areaScores)
    .sort(([, a], [, b]) => b - a)
    .map(([area, count]) => ({ area, count }));
}

// 디버깅용 API - 사용자 데이터 상태 확인
router.get("/debug/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info(`🔍 디버깅 API 호출: userId=${userId}`);

    // 1. UserProfile 확인
    const profile = await UserProfile.findOne({ userId });

    // 2. Submission 확인
    const submissions = await Submission.find({ "user.uid": userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // 3. 최근 제출물들의 AI 피드백 확인
    const submissionsWithFeedback = submissions.map((sub) => ({
      id: sub._id,
      title: sub.title,
      mode: sub.mode,
      createdAt: sub.createdAt,
      hasAiFeedback: !!sub.aiFeedback,
      aiFeedbackLength: sub.aiFeedback ? sub.aiFeedback.length : 0,
    }));

    const debugInfo = {
      userId,
      profileExists: !!profile,
      profileData: profile
        ? {
            writingHistory: {
              mode_300: profile.writingHistory?.mode_300?.length || 0,
              mode_1000: profile.writingHistory?.mode_1000?.length || 0,
            },
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : null,
      submissionsCount: submissions.length,
      submissionsWithFeedback,
      timestamp: new Date().toISOString(),
    };

    logger.info(`📊 디버깅 정보:`, debugInfo);

    res.json({
      success: true,
      debug: debugInfo,
    });
  } catch (error) {
    logger.error("❌ 디버깅 API 실패:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
