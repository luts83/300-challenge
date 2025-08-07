const UserProfile = require("../models/UserProfile");

class UserProfileService {
  // 사용자 프로필 업데이트
  async updateUserProfile(userId, newSubmission, aiFeedback) {
    try {
      // 1. 기존 프로필 가져오기
      let profile = await UserProfile.findOne({ userId });
      if (!profile) {
        profile = new UserProfile({
          userId,
          user: {
            email: newSubmission.user.email,
            displayName:
              newSubmission.user.displayName ||
              newSubmission.user.email.split("@")[0],
          },
          writingHistory: { mode_300: [], mode_1000: [] },
          writingStats: { mode_300: {}, mode_1000: {} },
        });
      } else {
        // 기존 프로필의 사용자 정보 업데이트
        profile.user = {
          email: newSubmission.user.email,
          displayName:
            newSubmission.user.displayName ||
            newSubmission.user.email.split("@")[0],
        };
      }

      const mode = newSubmission.mode;
      const modeKey = mode === "mode_300" ? "mode_300" : "mode_1000";

      // 2. 새 글 히스토리에 추가
      profile.writingHistory[modeKey].push({
        submissionId: newSubmission._id.toString(),
        date: new Date(),
        mode: mode,
        score: aiFeedback.overallScore,
        criteria: aiFeedback.criteria,
        aiFeedback: aiFeedback.feedback,
        userText: newSubmission.text,
        title: newSubmission.title,
        topic: newSubmission.topic,
        wordCount: newSubmission.text.length,
      });

      // 3. 히스토리 제한 (성능 최적화)
      if (modeKey === "mode_1000") {
        // 1000자 모드는 최대 20개까지 유지
        if (profile.writingHistory[modeKey].length > 20) {
          profile.writingHistory[modeKey] =
            profile.writingHistory[modeKey].slice(-20);
        }
      } else {
        // 300자 모드는 최대 10개까지 유지
        if (profile.writingHistory[modeKey].length > 10) {
          profile.writingHistory[modeKey] =
            profile.writingHistory[modeKey].slice(-10);
        }
      }

      // 4. 통계 재계산
      profile.writingStats[modeKey] = await this.calculateWritingStats(
        profile.writingHistory[modeKey],
        modeKey
      );

      await profile.save();
      return profile;
    } catch (error) {
      console.error("❌ 사용자 프로필 업데이트 실패:", error);
      throw error;
    }
  }

  // 글쓰기 통계 계산
  async calculateWritingStats(history, mode) {
    if (history.length === 0) {
      return {
        averageScore: 0,
        scoreTrend: "stable",
        strengthAreas: [],
        weaknessAreas: [],
        writingFrequency: 0,
        preferredTopics: [],
        commonMistakes: [],
        lastUpdated: new Date(),
      };
    }

    const scores = history.map((h) => h.score);
    const recentScores = history.slice(-5).map((h) => h.score);

    // 점수 트렌드 계산
    const trend = this.calculateTrend(recentScores);

    // 강점/약점 영역 분석
    const strengthAreas = this.analyzeStrengthAreas(history);
    const weaknessAreas = this.analyzeWeaknessAreas(history);

    // 주제 선호도 분석
    const preferredTopics = this.analyzePreferredTopics(history);

    // 자주 하는 실수 패턴 분석
    const commonMistakes = this.analyzeCommonMistakes(history);

    // NaN 방지를 위한 안전한 평균 계산
    const validScores = scores.filter(
      (score) => score !== null && score !== undefined && !isNaN(score)
    );
    const averageScore =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;

    const stats = {
      averageScore: averageScore,
      scoreTrend: trend,
      strengthAreas,
      weaknessAreas,
      writingFrequency: history.length / 4, // 4주 기준
      preferredTopics,
      commonMistakes,
      lastUpdated: new Date(),
    };

    // 1000자 모드인 경우 추가 분석
    if (mode === "mode_1000") {
      stats.writingStyle = this.analyzeWritingStyle(history);
    }

    return stats;
  }

  // 점수 트렌드 계산
  calculateTrend(scores) {
    if (scores.length < 2) return "stable";

    // 유효한 점수만 필터링
    const validScores = scores.filter(
      (score) => score !== null && score !== undefined && !isNaN(score)
    );
    if (validScores.length < 2) return "stable";

    const firstHalf = validScores.slice(0, Math.floor(validScores.length / 2));
    const secondHalf = validScores.slice(Math.floor(validScores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // NaN 체크
    if (isNaN(firstAvg) || isNaN(secondAvg)) return "stable";

    const diff = secondAvg - firstAvg;
    if (diff > 5) return "improving";
    if (diff < -5) return "declining";
    return "stable";
  }

  // 강점 영역 분석
  analyzeStrengthAreas(history) {
    const criteria = [
      "content",
      "expression",
      "structure",
      "originality",
      "consistency",
      "insight",
      "development",
    ];
    const averages = {};

    criteria.forEach((criterion) => {
      const scores = history
        .map((h) => h.criteria[criterion])
        .filter((s) => s !== undefined);
      if (scores.length > 0) {
        averages[criterion] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    // 평균보다 높은 영역들을 강점으로 분류
    const validAverages = Object.values(averages).filter(
      (avg) => avg !== null && avg !== undefined && !isNaN(avg)
    );
    if (validAverages.length === 0) return [];

    const overallAvg =
      validAverages.reduce((a, b) => a + b, 0) / validAverages.length;

    // NaN 체크
    if (isNaN(overallAvg)) return [];

    return Object.keys(averages).filter(
      (key) =>
        averages[key] !== null &&
        averages[key] !== undefined &&
        !isNaN(averages[key]) &&
        averages[key] > overallAvg + 5
    );
  }

  // 약점 영역 분석
  analyzeWeaknessAreas(history) {
    const criteria = [
      "content",
      "expression",
      "structure",
      "originality",
      "consistency",
      "insight",
      "development",
    ];
    const averages = {};

    criteria.forEach((criterion) => {
      const scores = history
        .map((h) => h.criteria[criterion])
        .filter((s) => s !== undefined);
      if (scores.length > 0) {
        averages[criterion] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    // 평균보다 낮은 영역들을 약점으로 분류
    const validAverages = Object.values(averages).filter(
      (avg) => avg !== null && avg !== undefined && !isNaN(avg)
    );
    if (validAverages.length === 0) return [];

    const overallAvg =
      validAverages.reduce((a, b) => a + b, 0) / validAverages.length;

    // NaN 체크
    if (isNaN(overallAvg)) return [];

    return Object.keys(averages).filter(
      (key) =>
        averages[key] !== null &&
        averages[key] !== undefined &&
        !isNaN(averages[key]) &&
        averages[key] < overallAvg - 5
    );
  }

  // 주제 선호도 분석
  analyzePreferredTopics(history) {
    const topicCounts = {};
    history.forEach((h) => {
      if (h.topic) {
        topicCounts[h.topic] = (topicCounts[h.topic] || 0) + 1;
      }
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  // 자주 하는 실수 패턴 분석 (간단한 버전)
  analyzeCommonMistakes(history) {
    // 실제로는 AI 피드백을 분석해서 패턴을 추출해야 함
    // 현재는 기본값 반환
    return ["문장 구조", "표현력"];
  }

  // 1000자 모드 글쓰기 스타일 분석
  analyzeWritingStyle(history) {
    if (history.length === 0) {
      return {
        sentenceLength: 0,
        paragraphStructure: "unknown",
        vocabularyLevel: "unknown",
        logicalFlow: "unknown",
      };
    }

    // 평균 문장 길이 계산 (간단한 버전)
    const validWordCounts = history
      .map((h) => h.wordCount)
      .filter(
        (count) => count !== null && count !== undefined && !isNaN(count)
      );

    if (validWordCounts.length === 0) {
      return {
        sentenceLength: 0,
        paragraphStructure: "unknown",
        vocabularyLevel: "unknown",
        logicalFlow: "unknown",
      };
    }

    const avgWordCount =
      validWordCounts.reduce((sum, count) => sum + count, 0) /
      validWordCounts.length;
    const avgSentenceLength = avgWordCount / 20; // 대략적인 문장 수 추정

    return {
      sentenceLength: Math.round(avgSentenceLength),
      paragraphStructure: "structured", // 기본값
      vocabularyLevel: "intermediate", // 기본값
      logicalFlow: "clear", // 기본값
    };
  }

  // 사용자 프로필 가져오기
  async getUserProfile(userId, userInfo = null) {
    try {
      let profile = await UserProfile.findOne({ userId });
      if (!profile) {
        profile = new UserProfile({
          userId,
          user: userInfo
            ? {
                email: userInfo.email,
                displayName:
                  userInfo.displayName || userInfo.email.split("@")[0],
              }
            : {
                email: "unknown@example.com",
                displayName: "익명",
              },
          writingHistory: { mode_300: [], mode_1000: [] },
          writingStats: { mode_300: {}, mode_1000: {} },
        });
        await profile.save();
      }
      return profile;
    } catch (error) {
      console.error("❌ 사용자 프로필 조회 실패:", error);
      throw error;
    }
  }
}

module.exports = new UserProfileService();
