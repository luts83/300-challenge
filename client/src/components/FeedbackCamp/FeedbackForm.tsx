import React, { useState } from 'react';
import { CONFIG } from '../../config';

interface StructuredFeedbackFormProps {
  submissionId: string;
  onSubmit: (submissionId: string, feedback: StructuredFeedback) => void;
  loading?: boolean;
}

interface StructuredFeedback {
  strengths: string;
  improvements: string;
  overall: string;
}

export const StructuredFeedbackForm: React.FC<StructuredFeedbackFormProps> = ({
  submissionId,
  onSubmit,
  loading = false,
}) => {
  const [feedback, setFeedback] = useState<StructuredFeedback>({
    strengths: '',
    improvements: '',
    overall: '',
  });

  const handleSubmit = () => {
    if (isValid()) {
      onSubmit(submissionId, feedback);
    }
  };

  const isValid = () => {
    return (
      feedback.strengths.length >= CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS &&
      feedback.improvements.length >= CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS
    );
  };

  return (
    <div className="mt-4 space-y-4">
      {/* 좋았던 점 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          좋았던 점 *
        </label>
        <textarea
          value={feedback.strengths}
          onChange={e => setFeedback(prev => ({ ...prev, strengths: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.STRENGTHS}
          className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-500 mt-1">
          {feedback.strengths.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS}자
        </div>
      </div>

      {/* 개선점 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          개선점 *
        </label>
        <textarea
          value={feedback.improvements}
          onChange={e => setFeedback(prev => ({ ...prev, improvements: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.IMPROVEMENTS}
          className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-500 mt-1">
          {feedback.improvements.length}자 / 최소{' '}
          {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS}자
        </div>
      </div>

      {/* 전체적인 느낌 (선택사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          전체적인 느낌 (선택사항)
        </label>
        <textarea
          value={feedback.overall}
          onChange={e => setFeedback(prev => ({ ...prev, overall: e.target.value }))}
          placeholder={CONFIG.FEEDBACK.STRUCTURED.PLACEHOLDERS.OVERALL}
          className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
        {feedback.overall && (
          <div className="text-sm text-gray-500 mt-1">
            {feedback.overall.length}자 / 최소 {CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL}자
          </div>
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid() || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>제출 중...</span>
            </>
          ) : (
            '피드백 제출'
          )}
        </button>
      </div>
    </div>
  );
};
