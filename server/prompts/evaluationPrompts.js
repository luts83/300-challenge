const {
  topics300,
  topics1000,
  weekendTopics300,
  weekendTopics1000,
} = require("../data/manualTopics");

const allTopics300 = [...topics300, ...weekendTopics300];
const allTopics1000 = [...topics1000, ...weekendTopics1000];

// 글 스타일 자동 감지 (가중치 기반 정교한 분석)
const detectWritingStyle = (text) => {
  const lowered = text.toLowerCase();

  // 더 정교한 키워드 매칭
  const goalKeywords = /목표|계획|달성|도전|실현|이루다|성취|목적|비전|꿈/;
  const emotiveKeywords =
    /감정|사랑|행복|위로|기쁨|눈물|슬픔|화남|설렘|감동|희망|두려움|불안/;
  const reflectiveKeywords =
    /회고|성찰|깨달음|후회|배움|변화|성장|인생|경험|교훈|이해|알다/;
  const narrativeKeywords =
    /그때|언젠가|어느날|기억|이야기|일화|에피소드|사건|발생|일어나다/;
  const analyticalKeywords =
    /분석|이유|원인|결과|관계|비교|대조|논리|사실|근거|증거|통계/;

  // 가중치 기반 점수 계산
  const scores = {
    goal: (lowered.match(goalKeywords) || []).length,
    emotive: (lowered.match(emotiveKeywords) || []).length,
    reflective: (lowered.match(reflectiveKeywords) || []).length,
    narrative: (lowered.match(narrativeKeywords) || []).length,
    analytical: (lowered.match(analyticalKeywords) || []).length,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return "general";

  return Object.keys(scores).find((key) => scores[key] === maxScore);
};

// 스타일별 평가 안내문 (더 구체적이고 차별화된 지침)
const styleInstruction = {
  goal: "이 글은 목표를 설정하고 계획을 서술하는 스타일입니다. 현실성, 구체성, 실행 가능성, 단계별 접근법을 중심으로 평가해주세요.",
  emotive:
    "이 글은 감정을 표현하는 글입니다. 감정 전달력, 묘사력, 표현의 생생함, 감정의 진정성을 중심으로 평가해주세요.",
  reflective:
    "이 글은 자기 성찰적인 글입니다. 통찰력, 솔직함, 글쓴이의 성장 서사, 깊이 있는 사고를 중심으로 평가해주세요.",
  narrative:
    "이 글은 서사형 글입니다. 이야기의 흥미, 전개, 결말의 완성도, 독자의 몰입도를 중심으로 평가해주세요.",
  analytical:
    "이 글은 분석형 글입니다. 논리적 사고, 근거 제시, 객관성, 분석의 깊이를 중심으로 평가해주세요.",
  general:
    "일반적인 서술형 글입니다. 전반적인 글의 완성도, 가독성, 메시지 전달력을 기준으로 평가해주세요.",
};

// 랜덤 평가 관점 추가 (매번 다른 시각 제공)
const randomPerspectives = [
  "독자의 관점에서 이 글이 어떻게 읽힐지 고려해주세요.",
  "글쓴이의 개성과 독창성이 잘 드러나는지 살펴보세요.",
  "이 글의 핵심 메시지가 명확하게 전달되는지 확인해주세요.",
  "글의 시작과 끝이 자연스럽게 연결되는지 평가해주세요.",
  "이 글이 글쓴이의 진정한 목소리를 담고 있는지 살펴보세요.",
  "독자에게 어떤 가치나 인사이트를 제공하는지 고려해주세요.",
];

// 기존 지침과 기준 함수들 (그대로 유지)
const getAssignedTopicGuidelines = (mode) => `
// 지정 주제 평가 지침
1. 평가의 정확성과 신뢰성을 최우선으로 해주세요:
   - 확실하지 않은 부분은 피드백하지 않습니다
   - 추측성 피드백은 하지 않습니다
   - 문제가 없다면 굳이 찾아내지 않습니다

2. 피드백 작성 시 다음 사항을 준수해주세요:
   - 실제 발견된 문제나 장점만 언급합니다
   - 문맥상 자연스러운 표현은 수정하지 않습니다
   - 전문 용어나 고유명사는 신중하게 판단합니다
   - 불확실한 경우 "~일 수 있습니다"와 같은 추측성 표현을 사용하지 않습니다

3. 맞춤법과 문법 피드백:
   - 100% 확신할 수 있는 오류만 지적합니다
   - 문맥상 자연스러운 표현은 오류로 판단하지 않습니다
   - 수정 제안은 확실한 경우에만 합니다

4. ${mode === "mode_300" ? "300자" : "1000자"} 분량에 맞는 ${
  mode === "mode_300" ? "간단명료한" : "심층적인"
} 분석을 제공해주세요.

5. 장점과 개선점:
   - 실제 발견된 긍정적인 부분만 구체적으로 설명합니다
   - 실제 개선이 필요한 부분만 구체적으로 제시합니다
   - 억지로 장점이나 개선점을 만들지 않습니다
`;

const getFreeTopicGuidelines = (mode) => `
// 자유 주제 평가 지침
1. 평가의 정확성과 신뢰성을 최우선으로 해주세요:
   - 확실하지 않은 부분은 피드백하지 않습니다
   - 추측성 피드백은 하지 않습니다
   - 문제가 없다면 굳이 찾아내지 않습니다

2. 피드백 작성 시 다음 사항을 준수해주세요:
   - 실제 발견된 문제나 장점만 언급합니다
   - 문맥상 자연스러운 표현은 수정하지 않습니다
   - 전문 용어나 고유명사는 신중하게 판단합니다
   - 불확실한 경우 "~일 수 있습니다"와 같은 추측성 표현을 사용하지 않습니다

3. 주제 평가:
   - 주제 선정의 참신성은 실제 발견된 내용에 기반하여 평가합니다
   - 주제 전개의 일관성은 실제 발견된 내용에 기반하여 평가합니다
   - 글쓴이의 개성과 창의적 표현은 실제 발견된 부분만 언급합니다

4. 맞춤법과 문법 피드백:
   - 100% 확신할 수 있는 오류만 지적합니다
   - 문맥상 자연스러운 표현은 오류로 판단하지 않습니다
   - 수정 제안은 확실한 경우에만 합니다

5. ${mode === "mode_300" ? "300자" : "1000자"} 분량에 맞는 ${
  mode === "mode_300" ? "간단명료한" : "심층적인"
} 분석을 제공해주세요.

6. 장점과 개선점:
   - 실제 발견된 긍정적인 부분만 구체적으로 설명합니다
   - 실제 개선이 필요한 부분만 구체적으로 제시합니다
   - 억지로 장점이나 개선점을 만들지 않습니다
`;

const getAssignedTopicCriteria = (mode) => {
  if (mode === "mode_300") {
    return `
    // 300자 지정 주제 평가 기준
    "content": {
        "score": 0-100,
        "feedback": "주제 이해도와 핵심 메시지 전달에 대한 간단명료한 피드백"
    },
    "expression": {
        "score": 0-100,
        "feedback": "간결하고 효과적인 표현에 대한 피드백"
    },
    "structure": {
        "score": 0-100,
        "feedback": "짧은 글의 구조와 흐름에 대한 피드백"
    },
    "technical": {
        "score": 0-100,
        "feedback": "기본적인 문법과 맞춤법에 대한 피드백"
    }
    `;
  } else {
    return `
    // 1000자 지정 주제 평가 기준
    "content": {
        "score": 0-100,
        "feedback": "주제 이해도, 내용의 깊이, 논리적 전개에 대한 심층적인 피드백 (예시 포함)"
    },
    "expression": {
        "score": 0-100,
        "feedback": "문체의 개성과 표현력에 대한 구체적인 피드백 (예시 포함)"
    },
    "structure": {
        "score": 0-100,
        "feedback": "문단 구성과 글의 완성도에 대한 상세한 피드백 (예시 포함)"
    },
    "technical": {
        "score": 0-100,
        "feedback": "문법, 맞춤법, 문장 구조에 대한 종합적인 피드백 (예시 포함)"
    }
    `;
  }
};

const getFreeTopicCriteria = (mode) => {
  if (mode === "mode_300") {
    return `
    // 300자 자유 주제 평가 기준
    "originality": {
        "score": 0-100,
        "feedback": "주제 선정의 참신성에 대한 간단명료한 피드백"
    },
    "consistency": {
        "score": 0-100,
        "feedback": "짧은 글의 일관성에 대한 피드백"
    },
    "expression": {
        "score": 0-100,
        "feedback": "간결하고 효과적인 표현에 대한 피드백"
    },
    "structure": {
        "score": 0-100,
        "feedback": "짧은 글의 구조와 흐름에 대한 피드백"
    },
    "technical": {
        "score": 0-100,
        "feedback": "기본적인 문법과 맞춤법에 대한 피드백"
    }
    `;
  } else {
    return `
    // 1000자 자유 주제 평가 기준
    "originality": {
        "score": 0-100,
        "feedback": "주제 선정의 독창성과 심층성에 대한 구체적인 피드백 (예시 포함)"
    },
    "insight": {
        "score": 0-100,
        "feedback": "글쓴이의 관점과 통찰력에 대한 구체적인 피드백 (예시 포함)"
    },
    "development": {
        "score": 0-100,
        "feedback": "주제 전개의 논리성과 설득력에 대한 구체적인 피드백 (예시 포함)"
    },
    "expression": {
        "score": 0-100,
        "feedback": "문체의 개성과 표현력에 대한 구체적인 피드백 (예시 포함)"
    },
    "structure": {
        "score": 0-100,
        "feedback": "문단 구성과 글의 완성도에 대한 구체적인 피드백 (예시 포함)"
    },
    "technical": {
        "score": 0-100,
        "feedback": "문법, 맞춤법, 문장 구조에 대한 종합적인 피드백 (예시 포함)"
    }
    `;
  }
};

// 템플릿 생성 함수
const PROMPT_TEMPLATE = {
  mode_300: (text, topic) => {
    const mode = "mode_300";
    const isAssigned =
      topic &&
      topic !== "자유주제" &&
      topic !== "주말에는 자유 주제로 글을 써보세요" &&
      allTopics300.includes(topic.trim());
    const style = detectWritingStyle(text);
    const randomPerspective =
      randomPerspectives[Math.floor(Math.random() * randomPerspectives.length)];

    return `
[사전 검토 및 평가 스탠스 설정]
1. **글의 완성도 및 성의 분석:**
   * 제출된 글이 최소한의 완성도(적정 분량, 명확한 문단 구분 등)를 갖추었는가?
   * 글쓴이가 스스로 "시간이 없다", "대충 썼다" 등 성의 부족을 드러내는 표현을 사용했는가?
   * 내용이 장난스럽거나 평가의 의미가 없을 정도로 단편적인가?

2. **평가 스탠스 결정:**
   * **만약 글의 성의나 완성도가 현저히 부족하다고 판단되면:** '엄격한 비평가'의 입장에서 평가를 진행한다. 전체 점수를 50점 미만으로 책정하고, '개선점'에 왜 이 글이 좋은 평가를 받기 어려운지를 핵심적으로 지적한다. 장점은 무리해서 찾지 말고, "글의 길이가 짧아 구체적인 장점을 찾기 어렵습니다." 와 같이 솔직하게 기술한다.
   * **만약 글이 충분한 성의를 갖추었다고 판단되면:** '친절한 코치'의 입장에서 잠재력을 끌어내는 방향으로 상세하게 평가한다.

[글 스타일 분석 결과]
시스템이 분석한 글의 스타일은 '${style}' 입니다.
${styleInstruction[style]}
**단, 만약 분석된 스타일이 글의 실제 내용과 맞지 않다고 판단되면, 시스템 분석 결과를 무시하고 가장 적절하다고 생각하는 스타일의 평가 기준을 적용하거나 'general' 기준으로 평가해주세요.**

[평가 대상 글]
주제: ${topic || "자유주제"}
내용: ${text}

[평가 지침]
${isAssigned ? getAssignedTopicGuidelines(mode) : getFreeTopicGuidelines(mode)}

[추가 지시]
${randomPerspective}
이전에 자주 등장하는 피드백 문구(예: "감각적 묘사 추가", "문장 간결화", "구체적 예시 추가")는 피하고, 이 글에 고유한 피드백을 제공해주세요.

[응답 형식]
{
  "critical_flaw": "글의 가치를 심각하게 훼손하는 치명적인 문제점 (예: 주제 이탈, 내용의 모순, 극도의 성의 부족 등). 문제가 없다면 '없음'으로 기술.",
  "overall_score": 0-100 사이 점수,
  "criteria_scores": {
    ${isAssigned ? getAssignedTopicCriteria(mode) : getFreeTopicCriteria(mode)}
  },
  "strengths": [
    "구체적인 장점1 (성의 없는 글의 경우, '찾기 어려움' 등으로 솔직하게 기술)",
    "구체적인 장점2 (예시 포함)",
    "구체적인 장점3 (예시 포함)"
  ],
  "improvements": [
    "구체적인 개선점1 (성의 없는 글의 경우, 왜 점수가 낮은지 핵심 이유를 지적)",
    "구체적인 개선점2 (예시 포함)",
    "구체적인 개선점3 (예시 포함)"
  ],
  "writing_tips": "다음 글쓰기를 위한 매우 구체적인 조언. '이렇게 써보세요' 형식으로, 실제 글의 문장을 활용한 'Before -> After' 예시를 최소 1개 이상 포함하여 제시할 것."
}

응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(\`\`\`)이나 설명 문구는 절대 포함하지 마세요.
모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
모든 항목을 반드시 빠짐없이 JSON으로 반환해주세요.
**중요: critical_flaw가 존재한다면, overall_score는 반드시 70점 미만이어야 합니다.**
`;
  },

  mode_1000: (text, topic) => {
    const mode = "mode_1000";
    const isAssigned =
      topic &&
      topic !== "자유주제" &&
      topic !== "주말에는 자유 주제로 글을 써보세요" &&
      allTopics1000.includes(topic.trim());
    const style = detectWritingStyle(text);
    const randomPerspective =
      randomPerspectives[Math.floor(Math.random() * randomPerspectives.length)];

    return `
[사전 검토 및 평가 스탠스 설정]
1. **글의 완성도 및 성의 분석:**
   * 제출된 글이 최소한의 완성도(적정 분량, 명확한 문단 구분 등)를 갖추었는가?
   * 글쓴이가 스스로 "시간이 없다", "대충 썼다" 등 성의 부족을 드러내는 표현을 사용했는가?
   * 내용이 장난스럽거나 평가의 의미가 없을 정도로 단편적인가?

2. **평가 스탠스 결정:**
   * **만약 글의 성의나 완성도가 현저히 부족하다고 판단되면:** '엄격한 비평가'의 입장에서 평가를 진행한다. 전체 점수를 50점 미만으로 책정하고, '개선점'에 왜 이 글이 좋은 평가를 받기 어려운지를 핵심적으로 지적한다. 장점은 무리해서 찾지 말고, "글의 길이가 짧아 구체적인 장점을 찾기 어렵습니다." 와 같이 솔직하게 기술한다.
   * **만약 글이 충분한 성의를 갖추었다고 판단되면:** '친절한 코치'의 입장에서 잠재력을 끌어내는 방향으로 상세하게 평가한다.

[글 스타일 분석 결과]
시스템이 분석한 글의 스타일은 '${style}' 입니다.
${styleInstruction[style]}
**단, 만약 분석된 스타일이 글의 실제 내용과 맞지 않다고 판단되면, 시스템 분석 결과를 무시하고 가장 적절하다고 생각하는 스타일의 평가 기준을 적용하거나 'general' 기준으로 평가해주세요.**

[평가 대상 글]
주제: ${topic || "자유주제"}
내용: ${text}

[평가 지침]
${isAssigned ? getAssignedTopicGuidelines(mode) : getFreeTopicGuidelines(mode)}

[추가 지시]
${randomPerspective}
이전에 자주 등장하는 피드백 문구(예: "감각적 묘사 추가", "문장 간결화", "구체적 예시 추가")는 피하고, 이 글에 고유한 피드백을 제공해주세요.

[응답 형식]
{
  "critical_flaw": "글의 가치를 심각하게 훼손하는 치명적인 문제점 (예: 주제 이탈, 내용의 모순, 극도의 성의 부족 등). 문제가 없다면 '없음'으로 기술.",
  "overall_score": 0-100 사이 점수,
  "criteria_scores": {
    ${isAssigned ? getAssignedTopicCriteria(mode) : getFreeTopicCriteria(mode)}
  },
  "strengths": [
    "구체적인 장점1 (성의 없는 글의 경우, '찾기 어려움' 등으로 솔직하게 기술)",
    "구체적인 장점2 (예시 포함)",
    "구체적인 장점3 (예시 포함)"
  ],
  "improvements": [
    "구체적인 개선점1 (성의 없는 글의 경우, 왜 점수가 낮은지 핵심 이유를 지적)",
    "구체적인 개선점2 (예시 포함)",
    "구체적인 개선점3 (예시 포함)"
  ],
  "writing_tips": "다음 글쓰기를 위한 매우 구체적인 조언. '이렇게 써보세요' 형식으로, 실제 글의 문장을 활용한 'Before -> After' 예시를 최소 1개 이상 포함하여 제시할 것."
}

응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(\`\`\`)이나 설명 문구는 절대 포함하지 마세요.
모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
모든 항목을 반드시 빠짐없이 JSON으로 반환해주세요.
**중요: critical_flaw가 존재한다면, overall_score는 반드시 70점 미만이어야 합니다.**
`;
  },
};

module.exports = PROMPT_TEMPLATE;
