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
      const normalizedOverall = Number(aiFeedback.overall_score) || 0;
      const criteriaScores = {};
      if (
        aiFeedback.criteria_scores &&
        typeof aiFeedback.criteria_scores === "object"
      ) {
        for (const [key, value] of Object.entries(aiFeedback.criteria_scores)) {
          criteriaScores[key] =
            typeof value === "object" && value !== null
              ? Number(value.score) || 0
              : Number(value) || 0;
        }
      }
      profile.writingHistory[modeKey].push({
        submissionId: newSubmission._id.toString(),
        date: new Date(),
        mode: mode,
        score: normalizedOverall,
        criteria: criteriaScores,
        aiFeedback: JSON.stringify(aiFeedback),
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
        userStyleProfile: { dominantStyle: "unknown", styleDistribution: {} },
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

    // 사용자 서명 스타일 분석
    const userStyleProfile = this.analyzeUserStyleProfile(history);

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
      userStyleProfile,
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
    const bucket = {};
    const bump = (k) => (bucket[k] = (bucket[k] || 0) + 1);

    const keywordRules = [
      { key: "문장 구조", regex: /(문장|구조|어순|군더더기|장황)/ },
      { key: "표현력", regex: /(표현|어휘|생동감|비유|묘사)/ },
      { key: "전개/논리", regex: /(논리|전개|근거|설득|일관성)/ },
      { key: "맞춤법/문법", regex: /(맞춤법|문법|띄어쓰기|철자|오탈자)/ },
      { key: "구체성", regex: /(구체|예시|세부|근거)/ },
      { key: "구조화", regex: /(문단|구성|서론|본론|결론)/ },
    ];

    for (const item of history) {
      let fbObj = null;
      try {
        if (item.aiFeedback) {
          fbObj = JSON.parse(item.aiFeedback);
        }
      } catch (e) {
        fbObj = null;
      }

      const improvements = Array.isArray(fbObj?.improvements)
        ? fbObj.improvements
        : [];
      const tips = fbObj?.writing_tips ? [fbObj.writing_tips] : [];
      const text = [...improvements, ...tips].join(" ");

      for (const { key, regex } of keywordRules) {
        if (regex.test(text)) bump(key);
      }
    }

    return Object.entries(bucket)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
  }

  // 1000자 모드 글쓰기 스타일 분석
  analyzeWritingStyle(history) {
    const texts = history.map((h) => h.userText).filter(Boolean);
    if (texts.length === 0) {
      return {
        sentenceLength: 0,
        paragraphStructure: "unknown",
        vocabularyLevel: "unknown",
        logicalFlow: "unknown",
      };
    }

    const all = texts.join("\n\n");
    const paragraphs = all.split(/\n{2,}/).filter(Boolean);
    const sentences = all
      .split(/[.!?…。\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const words = all.replace(/\n+/g, " ").split(/\s+/).filter(Boolean);

    const unique = new Set(words.map((w) => w.toLowerCase()));
    const typeTokenRatio = unique.size / Math.max(1, words.length);

    return {
      sentenceLength: Math.round(words.length / Math.max(1, sentences.length)),
      paragraphStructure: paragraphs.length >= 3 ? "structured" : "simple",
      vocabularyLevel:
        typeTokenRatio > 0.35
          ? "advanced"
          : typeTokenRatio > 0.25
          ? "intermediate"
          : "basic",
      logicalFlow: paragraphs.length >= 3 ? "clear" : "basic",
    };
  }

  // 사용자 서명 스타일 분석 (간단 키워드 기반)
  analyzeUserStyleProfile(history) {
    const styleCounts = {
      analytical: 0,
      emotive: 0,
      narrative: 0,
      reflective: 0,
      goal: 0,
      general: 0,
    };

    const analytical = /분석|이유|원인|결과|관계|비교|대조|논리|근거|증거|통계/;
    const emotive =
      /감정|사랑|행복|위로|기쁨|눈물|슬픔|화남|설렘|감동|희망|두려움|불안/;
    const narrative =
      /그때|언젠가|어느날|기억|이야기|일화|에피소드|사건|발생|일어나다/;
    const reflective =
      /회고|성찰|깨달음|후회|배움|변화|성장|인생|경험|교훈|이해/;
    const goal = /목표|계획|달성|도전|실현|이루다|성취|목적|비전|꿈/;

    for (const h of history) {
      const t = (h.userText || "").toLowerCase();
      const scores = {
        analytical: (t.match(analytical) || []).length,
        emotive: (t.match(emotive) || []).length,
        narrative: (t.match(narrative) || []).length,
        reflective: (t.match(reflective) || []).length,
        goal: (t.match(goal) || []).length,
      };
      const max = Math.max(...Object.values(scores), 0);
      const style =
        max === 0
          ? "general"
          : Object.keys(scores).find((k) => scores[k] === max) || "general";
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }

    const total = Object.values(styleCounts).reduce((a, b) => a + b, 0) || 1;
    const styleDistribution = Object.fromEntries(
      Object.entries(styleCounts).map(([k, v]) => [
        k,
        Number((v / total).toFixed(2)),
      ])
    );
    const dominantStyle = Object.entries(styleCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    return { dominantStyle, styleDistribution };
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
