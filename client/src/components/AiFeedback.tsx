// client/src/components/AiFeedback.tsx
import React from 'react';

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface AIFeedbackProps {
  feedback: string;
}

interface ParsedFeedback {
  overall_score: number;
  criteria_scores: {
    content: CriteriaScore;
    expression: CriteriaScore;
    structure: CriteriaScore;
    technical: CriteriaScore;
  };
  strengths: string[];
  improvements: string[];
  writing_tips: string;
}

const AIFeedback: React.FC<AIFeedbackProps> = ({ feedback }) => {
  try {
    // 피드백이 이미 JSON 객체인 경우를 처리
    const parsedFeedback: ParsedFeedback =
      typeof feedback === 'string' ? JSON.parse(feedback) : feedback;

    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 전체 점수 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{parsedFeedback.overall_score}점</div>
          <div className="text-gray-500">전체 평가 점수</div>
        </div>

        {/* 평가 기준별 점수와 피드백 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(parsedFeedback.criteria_scores).map(([criterion, data]) => (
            <div key={criterion} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold capitalize">
                  {criterion === 'content' && '내용'}
                  {criterion === 'expression' && '표현'}
                  {criterion === 'structure' && '구조'}
                  {criterion === 'technical' && '기술'}
                </h3>
                <span className="text-blue-600 font-bold">{data.score}점</span>
              </div>
              <p className="text-gray-600 text-sm">{data.feedback}</p>
            </div>
          ))}
        </div>

        {/* 장점 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-green-600">장점</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsedFeedback.strengths.map((strength, index) => (
              <li key={index} className="text-gray-600">
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* 개선점 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-amber-600">개선점</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsedFeedback.improvements.map((improvement, index) => (
              <li key={index} className="text-gray-600">
                {improvement}
              </li>
            ))}
          </ul>
        </div>

        {/* 글쓰기 팁 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-600 mb-2">글쓰기 팁</h3>
          <p className="text-gray-600">{parsedFeedback.writing_tips}</p>
        </div>
      </div>
    );
  } catch (error) {
    // JSON 파싱 에러가 발생하면 에러 메시지를 표시
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600">
          <p className="mb-2">AI 피드백을 표시할 수 없습니다.</p>
          <p className="text-sm text-gray-500">{feedback}</p>
        </div>
      </div>
    );
  }
};

export default AIFeedback;
