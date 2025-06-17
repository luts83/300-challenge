const {
  topics300,
  topics1000,
  weekendTopics300,
  weekendTopics1000,
} = require("../data/manualTopics");

const allTopics300 = [...topics300, ...weekendTopics300];
const allTopics1000 = [...topics1000, ...weekendTopics1000];

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

const PROMPT_TEMPLATE = {
  mode_300: (text, topic) => {
    const mode = "mode_300";
    const isAssigned =
      topic && topic !== "자유주제" && allTopics300.includes(topic.trim());

    // console.log("주제:", topic);
    // console.log("정제된 주제:", topic.trim());
    // console.log("포함 여부:", allTopics300.includes(topic.trim()));

    return `
    [평가 대상 글]
    주제: ${topic || "자유주제"}
    내용: ${text}
      
    [평가 지침]
    ${
      isAssigned
        ? getAssignedTopicGuidelines("mode_300")
        : getFreeTopicGuidelines("mode_300")
    }
      
    [응답 형식]
    {
        "overall_score": 0-100 사이 점수,
        "criteria_scores": {
            ${
              isAssigned
                ? getAssignedTopicCriteria("mode_300")
                : getFreeTopicCriteria("mode_300")
            }
        },
        "strengths": [
            "구체적인 장점1 (예시 포함)",
            "구체적인 장점2 (예시 포함)",
            "구체적인 장점3 (예시 포함)"
        ],
        "improvements": [
            "구체적인 개선점1 (예시 포함)",
            "구체적인 개선점2 (예시 포함)",
            "구체적인 개선점3 (예시 포함)"
        ],
        "writing_tips": "다음 글쓰기를 위한 구체적인 조언 (실제 예시 포함)"
    }
    
    응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(예: \`\`\`json)이나 설명 문구는 절대 포함하지 마세요.
    모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
    **모든 항목을 반드시 빠짐없이 JSON으로 반환해주세요. 한 항목이라도 누락되면 안 됩니다.**
    `;
  },

  mode_1000: (text, topic) => {
    const mode = "mode_1000";
    const isAssigned =
      topic && topic !== "자유주제" && allTopics1000.includes(topic.trim());

    // console.log("주제:", topic);
    // console.log("정제된 주제:", topic.trim());
    // console.log("포함 여부:", isAssigned);

    return `
      [평가 대상 글]
      주제: ${topic || "자유주제"}
      내용: ${text}
  
      [평가 지침]
      ${
        isAssigned
          ? getAssignedTopicGuidelines(mode)
          : getFreeTopicGuidelines(mode)
      }
  
      [응답 형식]
      {
          "overall_score": 0-100 사이 점수,
          "criteria_scores": {
              ${
                isAssigned
                  ? getAssignedTopicCriteria(mode)
                  : getFreeTopicCriteria(mode)
              }
          },
          "strengths": [
              "구체적인 장점1 (예시 포함)",
              "구체적인 장점2 (예시 포함)",
              "구체적인 장점3 (예시 포함)"
          ],
          "improvements": [
              "구체적인 개선점1 (예시 포함)",
              "구체적인 개선점2 (예시 포함)",
              "구체적인 개선점3 (예시 포함)"
          ],
          "writing_tips": "다음 글쓰기를 위한 구체적인 조언 (실제 예시 포함)"
      }
      
      응답은 반드시 유효한 JSON 형식만 출력해주세요. 마크다운 코드 블럭(예: \`\`\`json)이나 설명 문구는 절대 포함하지 마세요.
      모든 줄바꿈(엔터)은 \\n 으로 escape 처리하고, 문자열 안 따옴표는 \\"로 escape 처리하세요.
    **모든 항목을 반드시 빠짐없이 JSON으로 반환해주세요. 한 항목이라도 누락되면 안 됩니다.**
    `;
  },
};

module.exports = PROMPT_TEMPLATE;
