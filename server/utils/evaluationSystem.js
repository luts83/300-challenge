const userProfileService = require("../services/userProfileService");

/**
 * 개선된 평가 시스템
 * - 신규 사용자: 절대평가 + 신규 보정 (최대 85점)
 * - 경험 사용자: 절대평가 + 개인화 보정 (점수 변동 제한)
 * - 이상치 처리: 통계적 방법으로 데이터 품질 향상
 */
class ImprovedEvaluationSystem {
  /**
   * 통계적 이상치 탐지 및 제거
   * @param {Array<number>} scores - 점수 배열
   * @returns {Object} - 정제된 점수와 이상치 정보
   */
  static detectAndRemoveOutliers(scores) {
    if (scores.length < 3) {
      return { cleanScores: scores, outliers: [], method: "insufficient_data" };
    }

    // 방법 1: 표준편차 기반 이상치 탐지 (2σ 기준)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);

    const stdOutliers = scores.filter(
      (score) => Math.abs(score - mean) > 2 * std
    );
    const stdCleanScores = scores.filter(
      (score) => Math.abs(score - mean) <= 2 * std
    );

    // 방법 2: IQR 기반 이상치 탐지
    const sorted = [...scores].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const iqrOutliers = scores.filter(
      (score) => score < q1 - 1.5 * iqr || score > q3 + 1.5 * iqr
    );
    const iqrCleanScores = scores.filter(
      (score) => score >= q1 - 1.5 * iqr && score <= q3 + 1.5 * iqr
    );

    // 두 방법 중 더 보수적인 결과 선택 (이상치가 더 많이 탐지된 방법)
    const finalCleanScores =
      stdOutliers.length >= iqrOutliers.length
        ? stdCleanScores
        : iqrCleanScores;
    const finalOutliers =
      stdOutliers.length >= iqrOutliers.length ? stdOutliers : iqrOutliers;
    const method =
      stdOutliers.length >= iqrOutliers.length ? "standard_deviation" : "iqr";

    return {
      cleanScores: finalCleanScores,
      outliers: finalOutliers,
      method,
      statistics: {
        originalCount: scores.length,
        cleanCount: finalCleanScores.length,
        outlierCount: finalOutliers.length,
        mean:
          finalCleanScores.length > 0
            ? finalCleanScores.reduce((a, b) => a + b, 0) /
              finalCleanScores.length
            : 0,
        std:
          finalCleanScores.length > 0
            ? Math.sqrt(
                finalCleanScores.reduce(
                  (sq, n) => sq + Math.pow(n - mean, 2),
                  0
                ) / finalCleanScores.length
              )
            : 0,
      },
    };
  }

  /**
   * AI 평가 품질 검증 (모드별 맞춤형)
   * @param {Object|string} feedback - AI 피드백 객체 또는 JSON 문자열
   * @param {string} mode - 글쓰기 모드 (mode_300, mode_1000)
   * @returns {Object} - 검증 결과와 품질 점수
   */
  static validateAIEvaluation(feedback, mode = "mode_1000") {
    let qualityScore = 100;
    const issues = [];

    // JSON 문자열인 경우 파싱 시도
    let parsedFeedback = feedback;
    if (typeof feedback === "string") {
      try {
        parsedFeedback = JSON.parse(feedback);
      } catch (parseError) {
        return {
          isValid: false,
          qualityScore: 0,
          issues: ["json_parse_error"],
          recommendation: "invalid_json",
          parseError: parseError.message,
        };
      }
    }

    // 1. 기본 점수 범위 검증 (모든 모드 공통)
    if (
      !parsedFeedback.overall_score ||
      parsedFeedback.overall_score < 0 ||
      parsedFeedback.overall_score > 100
    ) {
      qualityScore -= 30;
      issues.push("overall_score_out_of_range");
    }

    // 2. 모드별 필수 필드 검증
    if (mode === "mode_300") {
      // 300자 모드: 더 간단한 검증
      if (
        !parsedFeedback.criteria_scores ||
        Object.keys(parsedFeedback.criteria_scores).length === 0
      ) {
        qualityScore -= 20;
        issues.push("missing_criteria_scores");
      }

      // 300자 모드에서는 strengths, improvements가 없어도 괜찮음
      // (간단한 평가이므로)
    } else {
      // 1000자 모드: 더 엄격한 검증
      if (
        !parsedFeedback.criteria_scores ||
        Object.keys(parsedFeedback.criteria_scores).length === 0
      ) {
        qualityScore -= 25;
        issues.push("missing_criteria_scores");
      }

      if (
        !parsedFeedback.strengths ||
        !Array.isArray(parsedFeedback.strengths) ||
        parsedFeedback.strengths.length === 0
      ) {
        qualityScore -= 15;
        issues.push("missing_strengths");
      }

      if (
        !parsedFeedback.improvements ||
        !Array.isArray(parsedFeedback.improvements) ||
        parsedFeedback.improvements.length === 0
      ) {
        qualityScore -= 15;
        issues.push("missing_improvements");
      }
    }

    // 3. 점수 일관성 검증 (모드별로 다른 기준)
    if (
      parsedFeedback.criteria_scores &&
      Object.keys(parsedFeedback.criteria_scores).length > 0
    ) {
      const criteriaScores = Object.values(parsedFeedback.criteria_scores)
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return item.score;
          }
          return item;
        })
        .filter((score) => score !== undefined && score !== null);

      if (criteriaScores.length > 0) {
        const avgCriteriaScore =
          criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length;
        const scoreDifference = Math.abs(
          parsedFeedback.overall_score - avgCriteriaScore
        );

        // 모드별로 다른 허용 범위
        const maxDifference = mode === "mode_300" ? 35 : 40;
        const moderateDifference = mode === "mode_300" ? 25 : 30;

        if (scoreDifference > maxDifference) {
          qualityScore -= 20;
          issues.push("large_score_discrepancy");
        } else if (scoreDifference > moderateDifference) {
          qualityScore -= 10;
          issues.push("moderate_score_discrepancy");
        }
      }
    }

    // 4. 내용 품질 검증 (모드별로 다른 기준)
    if (parsedFeedback.writing_tips) {
      const minLength = mode === "mode_300" ? 20 : 30;
      if (parsedFeedback.writing_tips.length < minLength) {
        qualityScore -= 10;
        issues.push("short_writing_tips");
      }
    }

    // 5. 모드별 추가 검증
    if (mode === "mode_1000") {
      // 1000자 모드에서만 필요한 필드들
      if (
        !parsedFeedback.improved_version ||
        !parsedFeedback.improved_version.content
      ) {
        qualityScore -= 10;
        issues.push("missing_improved_version");
      }
    }

    // 6. 추가 디버깅 정보
    const debugInfo = {
      mode,
      feedbackType: typeof feedback,
      parsedType: typeof parsedFeedback,
      hasOverallScore: "overall_score" in parsedFeedback,
      overallScoreValue: parsedFeedback.overall_score,
      criteriaScoresKeys: parsedFeedback.criteria_scores
        ? Object.keys(parsedFeedback.criteria_scores)
        : [],
      allKeys: Object.keys(parsedFeedback),
    };

    // 7. 모드별 품질 기준 조정
    const qualityThreshold = mode === "mode_300" ? 50 : 60; // 300자 모드는 더 관대하게

    return {
      isValid: qualityScore >= qualityThreshold,
      qualityScore: Math.max(0, qualityScore),
      issues,
      recommendation:
        qualityScore >= 90
          ? "excellent"
          : qualityScore >= 80
          ? "good"
          : qualityScore >= 70
          ? "acceptable"
          : qualityScore >= qualityThreshold
          ? "poor"
          : "very_poor",
      debugInfo,
    };
  }

  /**
   * 적응형 점수 제한 시스템
   * @param {number} absoluteScore - AI 절대평가 점수
   * @param {Array<number>} historicalScores - 과거 점수 배열
   * @param {string} mode - 글쓰기 모드
   * @returns {Object} - 적응형 제한 결과
   */
  static applyAdaptiveScoreLimiting(absoluteScore, historicalScores, mode) {
    if (historicalScores.length === 0) {
      return { finalScore: absoluteScore, method: "no_history", adjustment: 0 };
    }

    // 이상치 제거
    const { cleanScores, outliers, statistics } =
      this.detectAndRemoveOutliers(historicalScores);

    if (cleanScores.length === 0) {
      return {
        finalScore: absoluteScore,
        method: "all_outliers",
        adjustment: 0,
      };
    }

    // 정제된 점수로 통계 계산
    const cleanMean =
      cleanScores.reduce((a, b) => a + b, 0) / cleanScores.length;
    const cleanStd = Math.sqrt(
      cleanScores.reduce((sq, n) => sq + Math.pow(n - cleanMean, 2), 0) /
        cleanScores.length
    );

    // 데이터 품질에 따른 적응형 제한
    let maxVariation;
    if (cleanScores.length >= 10 && cleanStd < 15) {
      // 데이터가 많고 안정적일 때: 제한 완화
      maxVariation = mode === "mode_300" ? 20 : 30;
    } else if (cleanScores.length >= 5 && cleanStd < 20) {
      // 데이터가 적당하고 비교적 안정적일 때: 보통 제한
      maxVariation = mode === "mode_300" ? 15 : 25;
    } else {
      // 데이터가 적거나 불안정할 때: 보수적 제한
      maxVariation = mode === "mode_300" ? 12 : 20;
    }

    // 점수 제한 적용
    let finalScore = absoluteScore;
    let adjustment = 0;

    if (Math.abs(absoluteScore - cleanMean) > maxVariation) {
      if (absoluteScore > cleanMean + maxVariation) {
        finalScore = cleanMean + maxVariation;
        adjustment = -(absoluteScore - finalScore);
      } else if (absoluteScore < cleanMean - maxVariation) {
        finalScore = cleanMean - maxVariation;
        adjustment = finalScore - absoluteScore;
      }
    }

    return {
      finalScore: Math.round(finalScore),
      method: "adaptive_limiting",
      adjustment: Math.round(adjustment),
      statistics: {
        originalMean: cleanMean,
        originalStd: cleanStd,
        maxVariation,
        outlierCount: outliers.length,
        cleanCount: cleanScores.length,
      },
    };
  }

  /**
   * 사용자 유형에 따른 평가 적용
   * @param {string} userId - 사용자 ID
   * @param {number} absoluteScore - AI 절대평가 점수
   * @param {string} mode - 글쓰기 모드 (mode_300, mode_1000)
   * @returns {Promise<number>} - 최종 점수
   */
  static async applyUserTypeEvaluation(userId, absoluteScore, mode) {
    try {
      const profile = await userProfileService.getUserProfile(userId);
      const modeKey = mode === "mode_300" ? "mode_300" : "mode_1000";
      const writingCount = profile.writingHistory[modeKey].length;

      // 신규 사용자 (5회 미만)
      if (writingCount < 5) {
        return this.applyNewUserEvaluation(absoluteScore, writingCount);
      }

      // 경험 사용자 (5회 이상)
      return this.applyExperiencedUserEvaluation(
        profile,
        absoluteScore,
        modeKey
      );
    } catch (error) {
      console.error("❌ 평가 시스템 적용 실패:", error);
      return absoluteScore; // 에러 시 원본 점수 반환
    }
  }

  /**
   * 신규 사용자 평가 (5회 미만)
   * @param {number} absoluteScore - 절대평가 점수
   * @param {number} writingCount - 글쓰기 횟수
   * @returns {number} - 보정된 점수
   */
  static applyNewUserEvaluation(absoluteScore, writingCount) {
    // 신규 사용자 보정 로직
    let adjustedScore = absoluteScore;

    // 첫 글은 10% 보정, 이후 점진적 감소
    if (writingCount === 0) {
      adjustedScore = absoluteScore * 1.1; // 첫 글 10% 보정
    } else if (writingCount === 1) {
      adjustedScore = absoluteScore * 1.08; // 두 번째 글 8% 보정
    } else if (writingCount === 2) {
      adjustedScore = absoluteScore * 1.05; // 세 번째 글 5% 보정
    } else if (writingCount === 3) {
      adjustedScore = absoluteScore * 1.03; // 네 번째 글 3% 보정
    } else if (writingCount === 4) {
      adjustedScore = absoluteScore * 1.01; // 다섯 번째 글 1% 보정
    }

    // 신규 사용자 최대 점수 제한 (85점)
    const finalScore = Math.min(adjustedScore, 85);

    return Math.round(finalScore);
  }

  /**
   * 경험 사용자 평가 (5회 이상)
   * @param {Object} profile - 사용자 프로필
   * @param {number} absoluteScore - 절대평가 점수
   * @param {string} modeKey - 모드 키
   * @returns {number} - 보정된 점수
   */
  static applyExperiencedUserEvaluation(profile, absoluteScore, modeKey) {
    const history = profile.writingHistory[modeKey];
    const stats = profile.writingStats[modeKey];

    if (history.length === 0) {
      return absoluteScore;
    }

    // 과거 점수 배열 추출
    const historicalScores = history
      .map((h) => h.score)
      .filter((score) => score !== null && score !== undefined);

    // 새로운 적응형 점수 제한 시스템 적용
    const adaptiveResult = this.applyAdaptiveScoreLimiting(
      absoluteScore,
      historicalScores,
      modeKey
    );

    // 로깅 (디버깅용)
    console.log(`🔍 [적응형 점수 제한] ${modeKey}:`, {
      absoluteScore,
      finalScore: adaptiveResult.finalScore,
      method: adaptiveResult.method,
      adjustment: adaptiveResult.adjustment,
      statistics: adaptiveResult.statistics,
    });

    return adaptiveResult.finalScore;
  }

  /**
   * 평가 시스템 통계
   * @returns {Promise<Object>} - 평가 시스템 통계
   */
  static async getEvaluationStats() {
    try {
      const UserProfile = require("../models/UserProfile");
      const profiles = await UserProfile.find({});

      let newUserCount = 0;
      let experiencedUserCount = 0;
      let totalEvaluations = 0;
      let outlierStats = {
        totalOutliers: 0,
        totalCleanScores: 0,
        outlierDetectionMethods: {},
      };

      for (const profile of profiles) {
        const mode300Count = profile.writingHistory.mode_300.length;
        const mode1000Count = profile.writingHistory.mode_1000.length;

        if (mode300Count < 5 && mode1000Count < 5) {
          newUserCount++;
        } else {
          experiencedUserCount++;
        }

        totalEvaluations += mode300Count + mode1000Count;

        // 이상치 통계 수집
        if (mode300Count > 0) {
          const scores300 = profile.writingHistory.mode_300
            .map((h) => h.score)
            .filter((s) => s !== null);
          if (scores300.length >= 3) {
            const outlierResult = this.detectAndRemoveOutliers(scores300);
            outlierStats.totalOutliers += outlierResult.outliers.length;
            outlierStats.totalCleanScores += outlierResult.cleanScores.length;
            outlierStats.outlierDetectionMethods[outlierResult.method] =
              (outlierStats.outlierDetectionMethods[outlierResult.method] ||
                0) + 1;
          }
        }

        if (mode1000Count > 0) {
          const scores1000 = profile.writingHistory.mode_1000
            .map((h) => h.score)
            .filter((s) => s !== null);
          if (scores1000.length >= 3) {
            const outlierResult = this.detectAndRemoveOutliers(scores1000);
            outlierStats.totalOutliers += outlierResult.outliers.length;
            outlierStats.totalCleanScores += outlierResult.cleanScores.length;
            outlierStats.outlierDetectionMethods[outlierResult.method] =
              (outlierStats.outlierDetectionMethods[outlierResult.method] ||
                0) + 1;
          }
        }
      }

      return {
        userDistribution: {
          newUsers: newUserCount,
          experiencedUsers: experiencedUserCount,
          totalUsers: profiles.length,
        },
        evaluationCounts: {
          total: totalEvaluations,
          averagePerUser:
            profiles.length > 0 ? totalEvaluations / profiles.length : 0,
        },
        outlierAnalysis: outlierStats,
        systemHealth: {
          outlierRate:
            outlierStats.totalCleanScores > 0
              ? (outlierStats.totalOutliers /
                  (outlierStats.totalOutliers +
                    outlierStats.totalCleanScores)) *
                100
              : 0,
          dataQuality:
            outlierStats.totalCleanScores > 0
              ? (outlierStats.totalCleanScores /
                  (outlierStats.totalOutliers +
                    outlierStats.totalCleanScores)) *
                100
              : 0,
        },
      };
    } catch (error) {
      console.error("❌ 평가 시스템 통계 수집 실패:", error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = ImprovedEvaluationSystem;
