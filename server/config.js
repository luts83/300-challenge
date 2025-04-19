// server/config.js

module.exports = {
  TOKEN: {
    DAILY_LIMIT: 1, // 하루 사용할 수 있는 글쓰기 토큰 수
  },
  SUBMISSION: {
    MIN_LENGTH: 100, // ✍ 캠프 기간엔 1000자, 평소엔 300자
    MAX_LENGTH: 1000,
  },
  FEEDBACK: {
    REQUIRED_COUNT: 3, // 피드백을 3개 남겨야 열람 가능
    MIN_LENGTH: 10, // 피드백 최소 글자 수
    PER_SUBMISSION: 3, // 제출 시 부여되는 피드백 미션 수
  },
  AI: {
    ENABLE: true,
    MODEL: "anthropic/claude-3-haiku", // 영어로 나올 땐 이걸 확인
    SYSTEM_MESSAGE:
      "당신은 공감 능력이 뛰어난 한국어 글쓰기 평가자입니다. 답변은 반드시 한국어로 해주세요.",
    DEFAULT_SCORE: 70,
  },
  TOPIC: {
    MODE: "manual", // "manual" 또는 "ai"
    BASE_DATE: "2025-04-16", // 수동 주제 시작일 (getManualTopicByDate.js에서도 맞춰줘야 함)
    INTERVAL_DAYS: 1, // ✅ 몇 일마다 새로운 주제를 줄 것인가 (기본 1일)
  },
};
