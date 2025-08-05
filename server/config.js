// server/config.js
const { topics300, topics1000 } = require("./data/manualTopics");
const PROMPT_TEMPLATE = require("./prompts/evaluationPrompts");

module.exports = {
  ACCESS_CONTROL: {
    ENABLED: true, // 로그인 제한 X (모든 가입자 로그인 허용)
    ALLOWED_EMAILS: [], // 화이트리스트 이메일
    WHITELIST_TOKEN_POLICY: {
      DAILY_LIMIT_300: 1, // 300자: 매일 1개
      WEEKLY_LIMIT_1000: 1, // 1000자: 주간 1개
    },
    NON_WHITELIST_TOKEN_POLICY: {
      WEEKLY_LIMIT_300: 1, // 300자: 주간 1개
      WEEKLY_LIMIT_1000: 1, // 1000자: 주간 1개
    },
  },

  TOKEN: {
    DAILY_LIMIT_300: 1, // 300자 모드 하루 토큰 수 (현행 유지)
    DAILY_LIMIT_1000: 0, // 1000자 모드 일일 토큰 제한 제거
    WEEKLY_LIMIT_1000: 1, // 1000자 모드 주간 토큰 수 추가
    WEEKLY_LIMIT_300: 1, // ← 이 부분 추가
    GOLDEN_KEY: 1, // STREAK_BONUS를 GOLDEN_KEY로 변경
  },
  SUBMISSION: {
    MODE_300: { MIN_LENGTH: 250, MAX_LENGTH: 500 }, // 300자 모드 글자 제한 (250~500자로 확장)
    MODE_1000: { MIN_LENGTH: 800, MAX_LENGTH: 1000 }, // 1000자 모드 글자 제한
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
    STRUCTURED: {
      ENABLED: true,
      MIN_LENGTH: {
        STRENGTHS: 20,
        IMPROVEMENTS: 20,
        OVERALL: 10,
      },
      EXAMPLES: {
        STRENGTHS: [
          "구체적인 예시를 들어 설명한 부분이 인상적이었어요",
          "문단 구성이 체계적이고 읽기 쉬웠어요",
        ],
        IMPROVEMENTS: [
          "더 구체적인 사례를 추가하면 좋을 것 같아요",
          "문장을 좀 더 간결하게 다듬으면 더욱 명확해질 것 같아요",
        ],
      },
    },
  },
  AI: {
    ENABLE_300: true,
    ENABLE_1000: true,
    MODEL: "google/gemini-2.0-flash-exp", // Gemini 2.5 Pro로 변경
    SYSTEM_MESSAGE:
      "당신은 전문적인 글쓰기 코치입니다. 건설적이고 구체적인 피드백을 제공합니다.",

    // 평가 기준 세분화
    EVALUATION_CRITERIA: {
      // 지정 주제일 경우
      ASSIGNED: {
        CONTENT: { weight: 0.3 },
        EXPRESSION: { weight: 0.3 },
        STRUCTURE: { weight: 0.2 },
        TECHNICAL: { weight: 0.2 },
      },
      // 자유 주제일 경우
      FREE: {
        ORIGINALITY: { weight: 0.25 },
        CONSISTENCY: { weight: 0.25 },
        EXPRESSION: { weight: 0.2 },
        STRUCTURE: { weight: 0.2 },
        TECHNICAL: { weight: 0.1 },
      },
    },

    // 프롬프트 템플릿을 별도 파일에서 가져옴
    PROMPT_TEMPLATE,

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
    BASE_DATE: "2025-07-07", // 수동 주제 시작 기준일
    INTERVAL_DAYS: {
      MODE_300: 1, // 300자 모드는 매일 변경
      MODE_1000: 7, // 1000자 모드는 1주일마다 변경
    },
    SHOW_ON_HOME_300: true, // 추가
    SHOW_ON_HOME_1000: true, // 추가
    TOPICS_300: topics300, // 300자 모드용 수동 주제
    TOPICS_1000: topics1000, // 1000자 모드용 수동 주제
  },
};
