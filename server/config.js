// server/config.js
const { topics300, topics1000 } = require("./data/manualTopics");

module.exports = {
  TOKEN: {
    DAILY_LIMIT_300: 1, // 300자 모드 하루 토큰 수
    DAILY_LIMIT_1000: 1, // 1000자 모드 하루 토큰 수
    STREAK_BONUS: 1, // 1개의 보너스 토큰 지급으로 수정
  },
  SUBMISSION: {
    MODE_300: { MIN_LENGTH: 100, MAX_LENGTH: 300 }, // 300자 모드 글자 제한
    MODE_1000: { MIN_LENGTH: 600, MAX_LENGTH: 1000 }, // 1000자 모드 글자 제한
    TITLE: {
      // 제목 관련 설정 추가
      MIN_LENGTH: 1,
      MAX_LENGTH: 80,
      REQUIRED: true,
    },
  },
  FEEDBACK: {
    MIN_LENGTH: 10,
    REQUIRED_COUNT: 3, // 하루에 필요한 피드백 수
    PER_SUBMISSION: 3, // 글 1개당 할당되는 피드백 미션 수
    CROSS_MODE_FEEDBACK: {
      ENABLED: true,
      RESTRICTIONS: {
        mode_300: ["mode_300", "mode_1000"],
        mode_1000: ["mode_300", "mode_1000"],
      },
    },
  },
  AI: {
    ENABLE_300: true,
    ENABLE_1000: true,
    MODEL: "anthropic/claude-3-haiku",
    SYSTEM_MESSAGE:
      "당신은 전문적인 글쓰기 코치입니다. 건설적이고 구체적인 피드백을 제공합니다.",

    // 평가 기준 세분화
    EVALUATION_CRITERIA: {
      CONTENT: {
        weight: 0.3,
        aspects: ["주제 적합성", "내용의 깊이", "논리성"],
      },
      EXPRESSION: {
        weight: 0.3,
        aspects: ["감정 표현", "문체의 일관성", "창의성"],
      },
      STRUCTURE: {
        weight: 0.2,
        aspects: ["문단 구성", "글의 흐름", "결말의 완성도"],
      },
      TECHNICAL: {
        weight: 0.2,
        aspects: ["문법", "맞춤법", "문장 구조"],
      },
    },

    PROMPT_TEMPLATE: {
      mode_300: (text, topic) => `
        [평가 대상 글]
        주제: ${topic}
        내용: ${text}

        [평가 지침]
        1. 각 평가 기준별로 구체적인 점수와 피드백을 제시해주세요.
        2. 글의 장점을 먼저 언급한 후, 개선점을 제안해주세요.
        3. 300자 분량에 맞는 간단명료한 피드백을 제공해주세요.

        [응답 형식]
        {
          "overall_score": 0-100 사이 점수,
          "criteria_scores": {
            "content": {
              "score": 0-100,
              "feedback": "주제 관련성과 내용의 충실도에 대한 피드백"
            },
            "expression": {
              "score": 0-100,
              "feedback": "감정 표현과 문체에 대한 피드백"
            },
            "structure": {
              "score": 0-100,
              "feedback": "글의 구성과 흐름에 대한 피드백"
            },
            "technical": {
              "score": 0-100,
              "feedback": "문법과 맞춤법에 대한 피드백"
            }
          },
          "strengths": ["장점1", "장점2"],
          "improvements": ["개선점1", "개선점2"],
          "writing_tips": "다음 글쓰기를 위한 구체적인 조언"
        }
      `,
      mode_1000: (text, topic) => `
        [평가 대상 글]
        주제: ${topic}
        내용: ${text}

        [평가 지침]
        1. 각 평가 기준별로 상세한 점수와 피드백을 제시해주세요.
        2. 글의 장점을 먼저 언급한 후, 개선점을 제안해주세요.
        3. 1000자 분량에 맞는 심층적인 분석을 제공해주세요.
        4. 문단 구성과 논리적 전개에 대해 자세히 평가해주세요.

        [응답 형식]
        {
          "overall_score": 0-100 사이 점수,
          "criteria_scores": {
            "content": {
              "score": 0-100,
              "feedback": "주제 이해도, 내용의 깊이, 논리적 전개에 대한 상세 피드백"
            },
            "expression": {
              "score": 0-100,
              "feedback": "감정 표현, 문체의 일관성, 어휘 사용의 적절성에 대한 피드백"
            },
            "structure": {
              "score": 0-100,
              "feedback": "문단 구성, 글의 흐름, 서론-본론-결론의 균형에 대한 피드백"
            },
            "technical": {
              "score": 0-100,
              "feedback": "문법, 맞춤법, 문장 구조의 다양성에 대한 피드백"
            }
          },
          "strengths": ["장점1", "장점2", "장점3"],
          "improvements": ["개선점1", "개선점2", "개선점3"],
          "writing_tips": "다음 글쓰기를 위한 구체적인 조언과 연습 제안"
        }
      `,
    },

    // 피드백 품질 관리
    QUALITY_CHECK: {
      MIN_FEEDBACK_LENGTH: 100,
      REQUIRED_ELEMENTS: ["장점", "개선점", "구체적 조언"],
      TONE_GUIDELINES: [
        "긍정적이고 건설적인 톤 유지",
        "구체적인 예시 포함",
        "실천 가능한 조언 제시",
      ],
    },
  },

  TOPIC: {
    MODE: "manual", // "manual" | "ai"
    BASE_DATE: "2025-04-28", // 수동 주제 시작 기준일
    INTERVAL_DAYS: 1, // 몇 일 간격으로 주제를 바꿀지
    SHOW_ON_HOME_300: true, // 추가
    SHOW_ON_HOME_1000: true, // 추가
    TOPICS_300: topics300, // 300자 모드용 수동 주제
    TOPICS_1000: topics1000, // 1000자 모드용 수동 주제
  },
};
