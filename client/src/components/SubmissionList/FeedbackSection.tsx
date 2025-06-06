import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Submission {
  _id: string;
  title: string;
  text: string;
  score: number | null;
  feedback: string;
  createdAt: string;
  mode: 'mode_300' | 'mode_1000';
  feedbackUnlocked?: boolean;
  aiFeedback?: string;
}

interface FeedbackItem {
  content: string;
  createdAt: string;
  writer: {
    displayName: string;
  };
}

interface FeedbackSectionProps {
  submission: Submission;
  onUnlockFeedback?: () => void;
  feedbacks: FeedbackItem[];
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  submission,
  onUnlockFeedback,
  feedbacks,
}) => {
  const hasFeedback = feedbacks && feedbacks.length > 0;

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">피드백</h4>
        {hasFeedback && (
          <span className="text-xs text-green-600 font-medium">({feedbacks.length}개)</span>
        )}
      </div>

      {submission.feedbackUnlocked ? (
        <div className="bg-gray-50 dark:bg-orange-500/50 rounded-lg p-2 sm:p-3">
          {hasFeedback ? (
            <div className="space-y-2 sm:space-y-3">
              {feedbacks.map((feedback, index) => (
                <div
                  key={index}
                  className="p-2.5 sm:p-3 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm"
                >
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap">
                    {feedback.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-300">
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {feedback.writer.displayName}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(feedback.createdAt), 'PPP', { locale: ko })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">아직 받은 피드백이 없습니다.</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-300">🔒 피드백이 잠겨있습니다</p>
            {hasFeedback && (
              <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-medium">
                {feedbacks.length}개의 피드백이 있습니다
              </p>
            )}
          </div>
          {onUnlockFeedback && (
            <button
              onClick={e => {
                e.stopPropagation();
                onUnlockFeedback();
              }}
              className="w-full sm:w-auto px-3 py-2 bg-blue-500 dark:bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              황금열쇠로 열기
            </button>
          )}
        </div>
      )}
    </div>
  );
};
