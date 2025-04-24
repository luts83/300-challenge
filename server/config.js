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
    DEFAULT_SCORE: 50,
    MODEL: "anthropic/claude-3-haiku",
    SYSTEM_MESSAGE:
      "당신은 공감 능력이 뛰어난 한국어 글쓰기 평가자입니다. 답변은 반드시 한국어로 해주세요.",
    PROMPT_TEMPLATE: {
      mode_300: (text, topic) => `
        너는 초등학생 또는 중학생이 쓴 짧은 글을 평가하는 AI야.

        다음 기준으로 간단하고 진심 어린 피드백을 줘.

        [평가 기준]
        1. 글이 주제("${topic}")와 관련 있는가?
        2. 감정이 진솔하게 드러나는가?
        3. 문장이 어색하지 않고 자연스러운가?

        [응답 형식]
        {
          "score": 0~100 사이 숫자,
          "feedback": "짧고 따뜻한 피드백"
        }

        [사용자의 글]
        ${text}
      `,
      mode_1000: (text, topic) => `
        너는 성인이 쓴 에세이를 평가하는 AI야.

        다음 기준으로 점수와 피드백을 JSON으로 줘.

        [평가 기준]
        1. 글이 주제("${topic}")와 관련 있는가?
        2. 감정을 잘 표현했는가?
        3. 문장이 자연스럽고 잘 읽히는가?
        4. 맞춤법이나 문법 오류는 없는가?

        [응답 형식]
        {
          "score": 0~100 사이 숫자,
          "feedback": "진심 어린 구체적인 피드백"
        }

        [사용자의 글]
        ${text}
      `,
    },
  },

  TOPIC: {
    MODE: "manual", // "manual" | "ai"
    BASE_DATE: "2025-04-22", // 수동 주제 시작 기준일
    INTERVAL_DAYS: 1, // 몇 일 간격으로 주제를 바꿀지
    SHOW_ON_HOME_300: true, // 추가
    SHOW_ON_HOME_1000: true, // 추가
    TOPICS_300: topics300, // 300자 모드용 수동 주제
    TOPICS_1000: topics1000, // 1000자 모드용 수동 주제
  },
};
