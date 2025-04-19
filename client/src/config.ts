// client/src/config.ts

export const CONFIG = {
  TOKEN: {
    DAILY_LIMIT: 1, // 하루 글쓰기 횟수
  },
  SUBMISSION: {
    MAX_CHAR_COUNT: 1000, // 캠프 기준: 1000자 / 일반 시엔 300자
    MIN_CHAR_COUNT: 100,  // 최소 글자 수
  },
  FEEDBACK: {
    REQUIRED_COUNT: 3,     // 받은 피드백 열람 조건
    MIN_LENGTH: 10,        // 피드백 최소 길이
    PER_SUBMISSION: 3,     // 피드백 미션 할당 수
  },
  AI: {
    ENABLE: true,
    DEFAULT_SCORE: 70,
  },
  MESSAGES: {
    FEEDBACK_LOCK: "✋ 다른 사람의 글에 3개 이상 피드백을 남기면, 받은 피드백을 볼 수 있어요.",
    NO_FEEDBACK: "📭 아직 도착한 피드백이 없습니다.",
    NEW_FEEDBACK: (count: number) => `💌 새로운 피드백 ${count}개 도착했어요.`,
  },
  TIMER: {
    DURATION_MINUTES: 30, // 글쓰기 제한 시간 (분 단위) – 캠프 시엔 10으로도 쉽게 변경 가능
  },
  TOPIC: {
    SHOW_ON_HOME: false, // 홈 화면에 '오늘의 주제'를 보여줄지 여부
  },
};
