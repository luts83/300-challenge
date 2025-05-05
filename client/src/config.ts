// client/src/config.ts
export const CONFIG = {
  // ✍ 글쓰기 토큰 제한 (글쓰기 모드별로 관리)
  TOKEN: {
    DAILY_LIMIT_300: 1, // 300자 글쓰기 하루 횟수
    DAILY_LIMIT_1000: 1, // 1000자 글쓰기 하루 횟수
    STREAK_BONUS: 1, // 주간 목표 달성 시 보너스 토큰 수
  },

  // ✍ 글자 수 제한
  SUBMISSION: {
    MODE_300: { MIN_LENGTH: 100, MAX_LENGTH: 300 },
    MODE_1000: { MIN_LENGTH: 800, MAX_LENGTH: 1500 },
    TITLE: {
      REQUIRED: true,
      MIN_LENGTH: 1,
      MAX_LENGTH: 80,
      PLACEHOLDER: '제목을 입력해주세요 (최대 80자)',
    },
    RESET_LIMIT_1000: 3, // 사용자가 최대 3번 초기화 가능
  },

  // 🤝 피드백 조건
  FEEDBACK: {
    REQUIRED_COUNT: 3, // 받은 피드백 열람 조건
    MIN_LENGTH: 10, // 피드백 최소 길이
    PER_SUBMISSION: 3, // 피드백 미션 수
    // 교차 피드백 설정 추가
    CROSS_MODE_FEEDBACK: {
      ENABLED: true, // true면 교차 피드백 가능, false면 같은 모드끼리만 가능
      RESTRICTIONS: {
        // 특정 모드 간의 교차 피드백 제한 설정 (향후 확장성 고려)
        mode_300: ['mode_300', 'mode_1000'], // 300자 작성자가 피드백 가능한 모드들
        mode_1000: ['mode_300', 'mode_1000'], // 1000자 작성자가 피드백 가능한 모드들
      },
    },
  },

  // 🤖 AI 피드백 설정
  AI: {
    ENABLE_300: true,
    ENABLE_1000: true,
  },

  // 🧠 안내 메시지
  MESSAGES: {
    FEEDBACK_LOCK: '✋ 다른 사람의 글에 3개 이상 피드백을 남기면, 받은 피드백을 볼 수 있어요.',
    NO_FEEDBACK: '📭 아직 도착한 피드백이 없습니다.',
    NEW_FEEDBACK: (count: number) => `💌 새로운 피드백 ${count}개 도착했어요.`,
  },

  // ⏱ 타이머 설정 (300자 글쓰기 기준, ms 단위 아님!)
  TIMER: {
    DURATION_MINUTES: 5, // 타임어택 제한 시간
  },

  // 📌 주제 표시 여부
  TOPIC: {
    SHOW_ON_HOME_300: true,
    SHOW_ON_HOME_1000: false,
  },
};
