const userProfileService = require("../services/userProfileService");

/**
 * 개선된 평가 시스템
 * - 신규 사용자: 절대평가 + 신규 보정 (최대 85점)
 * - 경험 사용자: 절대평가 + 개인화 보정 (점수 변동 제한)
 */
class ImprovedEvaluationSystem {
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

    const personalAvg = stats.averageScore || 0;
    const lastScore = history[history.length - 1].score;

    // 점수 변동 허용 범위 (기존 20점 → 15점으로 축소)
    const maxVariation = 15;

    // 개인화 보정 적용
    let adjustedScore = absoluteScore;

    // 평균 점수 기준으로 보정
    if (Math.abs(absoluteScore - personalAvg) > maxVariation) {
      if (absoluteScore > personalAvg + maxVariation) {
        adjustedScore = personalAvg + maxVariation;
      } else if (absoluteScore < personalAvg - maxVariation) {
        adjustedScore = personalAvg - maxVariation;
      }
    }

    // 최근 점수와의 급격한 변동 방지
    if (Math.abs(adjustedScore - lastScore) > maxVariation) {
      if (adjustedScore > lastScore + maxVariation) {
        adjustedScore = lastScore + maxVariation;
      } else if (adjustedScore < lastScore - maxVariation) {
        adjustedScore = lastScore - maxVariation;
      }
    }

    const finalScore = Math.round(adjustedScore);

    return finalScore;
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

      for (const profile of profiles) {
        const mode300Count = profile.writingHistory.mode_300.length;
        const mode1000Count = profile.writingHistory.mode_1000.length;

        if (mode300Count < 5 && mode1000Count < 5) {
          newUserCount++;
        } else {
          experiencedUserCount++;
        }

        totalEvaluations += mode300Count + mode1000Count;
      }

      return {
        totalUsers: profiles.length,
        newUsers: newUserCount,
        experiencedUsers: experiencedUserCount,
        totalEvaluations,
        systemVersion: "2.0 (개선된 평가 시스템)",
      };
    } catch (error) {
      console.error("❌ 평가 시스템 통계 조회 실패:", error);
      return null;
    }
  }
}

module.exports = ImprovedEvaluationSystem;
