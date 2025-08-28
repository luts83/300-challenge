// client/src/config.ts
export const CONFIG = {
  // ✍ 글쓰기 토큰 제한 (글쓰기 모드별로 관리)
  TOKEN: {
    DAILY_LIMIT_300: 1, // 300자 글쓰기 하루 횟수
    WEEKLY_LIMIT_1000: 1, // 1000자 글쓰기 주간 횟수
    GOLDEN_KEY: 1, // 주간 목표 달성 시 황금열쇠 수
  },

  // ✍ 글자 수 제한
  SUBMISSION: {
    MODE_300: { MIN_LENGTH: 250, MAX_LENGTH: 500 }, // 300자 모드 글자 제한 (250~500자로 확장)
    MODE_1000: { MIN_LENGTH: 800, MAX_LENGTH: 1000 },
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

    // 구조화된 피드백 설정 추가
    STRUCTURED: {
      ENABLED: true,
      MIN_LENGTH: {
        OVERALL: 15, // 전체적인 느낌을 필수로 변경, 최소 15자
        STRENGTHS: 0, // 마음에 드는 부분을 선택사항으로 변경, 제한 없음
        IMPROVEMENTS: 0, // 더 멋진 방향을 선택사항으로 변경, 제한 없음
      },
      PLACEHOLDERS: {
        OVERALL: '이 글에 대한 전체적인 느낌이나 생각을 자유롭게 작성해주세요 (최소 15자)',
        STRENGTHS: '이 글의 마음에 드는 부분이나 인상적인 점을 자유롭게 작성해주세요 (선택사항)',
        IMPROVEMENTS:
          '더 멋진 글이 될 수 있는 방향이나 아이디어를 자유롭게 제안해주세요 (선택사항)',
      },
      // 필수/선택 구분을 위한 설정 추가
      REQUIRED_FIELDS: ['overall'],
      OPTIONAL_FIELDS: ['strengths', 'improvements'],
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
    DURATION_MINUTES: 0.5, // 타임어택 제한 시간
  },

  // 📌 주제 표시 여부
  TOPIC: {
    SHOW_ON_HOME_300: true,
    SHOW_ON_HOME_1000: true,
  },
};
