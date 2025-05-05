import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FeedbackSection } from './FeedbackSection';
import AIFeedback from '../AIFeedback';
import { useUser } from '../../context/UserContext';
import { LikeDisplay } from '../HelpfulButton';

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
  topic?: string;
  likeCount?: number;
  likedUsers?: { uid: string; displayName: string }[];
}

interface SubmissionItemProps {
  submission: Submission;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUnlockFeedback?: () => void;
  feedbacks: FeedbackItem[];
}

export const SubmissionItem = React.memo(
  ({
    submission,
    isExpanded,
    onToggleExpand,
    onUnlockFeedback,
    feedbacks,
  }: SubmissionItemProps) => {
    const { user } = useUser();
    const formattedDate = format(new Date(submission.createdAt), 'PPP', { locale: ko });
    const hasFeedback = feedbacks && feedbacks.length > 0;

    return (
      <div
        className={`bg-white rounded-lg shadow-sm overflow-hidden mb-3 sm:mb-4 
        ${hasFeedback ? 'border-l-4 border-green-500' : ''}`}
      >
        <div
          className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 break-all line-clamp-2">
                  {submission.title}
                </h3>
                {/* 데스크탑(중간 이상)에서만 주제 표시 */}
                {submission.topic && (
                  <span className="hidden sm:inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {submission.topic}
                  </span>
                )}
              </div>
              {/* 모바일(소형)에서는 주제만 별도 줄에 표시 */}
              {submission.topic && (
                <span
                  className="inline-block sm:hidden w-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mb-1"
                  style={{ maxWidth: '100%' }}
                >
                  {submission.topic}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500">
                <span>{formattedDate}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {submission.mode === 'mode_300' ? '300자' : '1000자'}
                </span>
                <LikeDisplay
                  likeCount={submission.likeCount || 0}
                  liked={submission.likedUsers?.includes(user?.uid)} // ✅ user null 체크
                  likedUsernames={submission.likedUsers?.map(user => user.displayName)}
                />
                <div className="flex items-center gap-1.5">
                  {submission.feedbackUnlocked && hasFeedback && (
                    <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      💬 {feedbacks.length}
                    </span>
                  )}
                  {!submission.feedbackUnlocked && hasFeedback && (
                    <span className="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      🔒
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-gray-400 text-lg">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100">
            <div className="p-3 sm:p-4">
              <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 break-all">
                {submission.text}
              </div>
            </div>

            {submission.score !== null && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <h4 className="text-lg font-medium text-gray-700 mb-2">AI 평가</h4>
                {submission.aiFeedback ? (
                  <AIFeedback feedback={submission.aiFeedback} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">{submission.score}점</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100">
              <FeedbackSection
                submission={submission}
                onUnlockFeedback={onUnlockFeedback}
                feedbacks={feedbacks}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.submission._id === nextProps.submission._id &&
      prevProps.feedbacks.length === nextProps.feedbacks.length
    );
  }
);
