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
  criteria_scores: Record<string, CriteriaScore>;
  strengths: string[];
  improvements: string[];
  writing_tips: string;
}

const CRITERIA_LABELS: Record<string, string> = {
  content: '내용',
  originality: '독창성',
  consistency: '일관성',
  insight: '통찰력',
  development: '전개',
  expression: '표현',
  structure: '구조',
  technical: '기술',
};

const AIFeedback: React.FC<AIFeedbackProps> = ({ feedback }) => {
  try {
    const parsedFeedback: ParsedFeedback =
      typeof feedback === 'string' ? JSON.parse(feedback) : feedback;

    return (
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-6 space-y-6">
        {/* 전체 점수 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
            {parsedFeedback.overall_score}점
          </div>
          <div className="text-gray-500 dark:text-gray-300">전체 평가 점수</div>
        </div>

        {/* 평가 기준별 점수와 피드백 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(parsedFeedback.criteria_scores).map(([criterion, data]) => (
            <div
              key={criterion}
              className="border border-gray-100 dark:border-gray-300 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{CRITERIA_LABELS[criterion] || criterion}</h3>
                <span className="text-blue-600 dark:text-blue-300 font-bold">{data.score}점</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{data.feedback}</p>
            </div>
          ))}
        </div>

        {/* 장점 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-green-600 dark:text-green-300">장점</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsedFeedback.strengths.map((strength, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-300">
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* 개선점 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-amber-600 dark:text-amber-300">개선점</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsedFeedback.improvements.map((improvement, index) => (
              <li key={index} className="text-gray-600 dark:text-gray-300">
                {improvement}
              </li>
            ))}
          </ul>
        </div>

        {/* 글쓰기 팁 */}
        <div className="bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-600 dark:text-blue-300 mb-2">글쓰기 팁</h3>
          <p className="text-gray-600 dark:text-gray-300">{parsedFeedback.writing_tips}</p>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p className="mb-2">AI 피드백을 표시할 수 없습니다.</p>
          <p className="text-sm text-gray-500 dark:text-gray-300 break-all">{feedback}</p>
        </div>
      </div>
    );
  }
};

export default AIFeedback;
