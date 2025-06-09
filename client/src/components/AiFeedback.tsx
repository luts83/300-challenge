import React, { useState, useEffect } from 'react';

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface AIFeedbackProps {
  feedback: string;
}

interface ParsedFeedback {
  overall_score: number;
  criteria_scores: Record<string, { score: number; feedback: string }>;
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
  const [error, setError] = useState<string | null>(null);
  const [parsedFeedback, setParsedFeedback] = useState<ParsedFeedback | null>(null);

  useEffect(() => {
    try {
      let parsed: any;

      // 1. 파싱 시도
      if (typeof feedback === 'string') {
        try {
          parsed = JSON.parse(feedback);
        } catch (parseError) {
          throw new Error('피드백 파싱에 실패했습니다.');
        }
      } else {
        parsed = feedback;
      }

      // 2. 데이터 검증 및 정규화
      const validated: ParsedFeedback = {
        overall_score: Number(parsed.overall_score) || 0,
        criteria_scores: {},
        strengths: [],
        improvements: [],
        writing_tips: '',
      };

      // criteria_scores 처리
      if (parsed.criteria_scores && typeof parsed.criteria_scores === 'object') {
        Object.entries(parsed.criteria_scores).forEach(([key, value]: [string, any]) => {
          validated.criteria_scores[key] = {
            score: Number(value.score) || 0,
            feedback: String(value.feedback || '평가 정보가 없습니다.'),
          };
        });
      }

      // strengths 처리
      if (Array.isArray(parsed.strengths)) {
        validated.strengths = parsed.strengths.map(String);
      }

      // improvements 처리
      if (Array.isArray(parsed.improvements)) {
        validated.improvements = parsed.improvements.map(String);
      }

      // writing_tips 처리
      if (parsed.writing_tips) {
        if (typeof parsed.writing_tips === 'string') {
          validated.writing_tips = parsed.writing_tips;
        } else if (typeof parsed.writing_tips === 'object') {
          validated.writing_tips = Object.entries(parsed.writing_tips)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
      }

      setParsedFeedback(validated);
      setError(null);
    } catch (err) {
      console.error('AI 피드백 처리 중 오류:', err);
      setError('피드백을 표시할 수 없습니다.');
      setParsedFeedback(null);
    }
  }, [feedback]);

  if (error || !parsedFeedback) {
    return (
      <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p className="mb-2">{error || '피드백을 불러오는 중...'}</p>
          {error && (
            <p className="text-sm text-gray-500 dark:text-gray-300 break-all">
              {typeof feedback === 'string' ? feedback : JSON.stringify(feedback)}
            </p>
          )}
        </div>
      </div>
    );
  }

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
};

export default AIFeedback;
