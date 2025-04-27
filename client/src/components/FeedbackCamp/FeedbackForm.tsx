import React from 'react';
import { CONFIG } from '../../config';

interface FeedbackFormProps {
  submissionId: string;
  content: string;
  onChange: (value: string) => void;
  onSubmit: (submissionId: string, e: React.MouseEvent) => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  submissionId,
  content,
  onChange,
  onSubmit,
}) => {
  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder={`${CONFIG.FEEDBACK.MIN_LENGTH}자 이상의 피드백을 작성해주세요.`}
        className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {content.length}자 / 최소 {CONFIG.FEEDBACK.MIN_LENGTH}자
        </span>
        <button
          onClick={e => onSubmit(submissionId, e)}
          disabled={content.length < CONFIG.FEEDBACK.MIN_LENGTH}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          피드백 제출
        </button>
      </div>
    </div>
  );
};
