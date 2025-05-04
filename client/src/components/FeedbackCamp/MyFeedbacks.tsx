// src/components/FeedbackCamp/MyFeedbacks.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Feedback } from './types';
import { Submission } from './types';
import HelpfulButton from '../HelpfulButton';
import { useUser } from '../../context/UserContext';

interface MyFeedbacksProps {
  submissions: Submission[];
  feedbacks: Feedback[];
  visibleCount: number;
  onLoadMore: () => void;
  totalCount: number;
}

export const MyFeedbacks: React.FC<MyFeedbacksProps> = ({
  submissions,
  feedbacks,
  visibleCount,
  onLoadMore,
  totalCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const { user } = useUser();

  const fetchGivenFeedbacks = async () => {
    console.log('fetchGivenFeedbacks 호출됨');
    if (!user) return;
    try {
      // ... (이하 생략)
    } catch (err) {
      // ... (이하 생략)
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      {/* 헤더 섹션 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold">✍ 내가 작성한 피드백</h3>
          <span className="text-sm text-gray-500">({totalCount})</span>
        </div>
        <span className="text-gray-400 text-lg">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            {feedbacks.slice(0, visibleCount).map(feedback => {
              const submission = submissions.find(s => s._id === feedback.toSubmissionId);

              return (
                <div key={feedback._id} className="border rounded-lg">
                  <div
                    className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setSelectedFeedback(selectedFeedback === feedback._id ? null : feedback._id)
                    }
                  >
                    <div className="flex flex-col items-start gap-1">
                      {/* 1. 제목 + 주제(데스크탑), 제목만(모바일) */}
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-medium text-gray-900 break-all line-clamp-1">
                          {feedback.submissionTitle || '(제목 없음)'}
                        </h4>
                        {/* 데스크탑(중간 이상)에서만 주제 표시 */}
                        {(feedback.submissionTopic || submission?.topic) && (
                          <span className="hidden sm:inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {feedback.submissionTopic || submission?.topic}
                          </span>
                        )}
                      </div>
                      {/* 모바일(소형)에서는 주제만 별도 줄에 표시, 텍스트 길이만큼만 배경 */}
                      {(feedback.submissionTopic || submission?.topic) && (
                        <span className="inline-block sm:hidden text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mb-1">
                          {feedback.submissionTopic || submission?.topic}
                        </span>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                        <span>{feedback.submissionAuthor?.displayName || '익명'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{format(new Date(feedback.createdAt), 'PPP', { locale: ko })}</span>
                        <HelpfulButton submissionId={feedback.toSubmissionId} userUid={user?.uid} />
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            feedback.mode === 'mode_300'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {feedback.mode === 'mode_300' ? '300자' : '1000자'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedFeedback === feedback._id && (
                    <div className="border-t border-gray-100">
                      <div className="p-3 sm:p-4">
                        {feedback.submissionText && (
                          <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-50 rounded text-sm text-gray-700">
                            <div className="text-xs text-gray-500 mb-1">원문</div>
                            {feedback.submissionText}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>내 피드백</span>
                            <span>
                              {format(new Date(feedback.createdAt), 'PPP a h:mm', { locale: ko })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {feedback.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {visibleCount < totalCount && (
            <button
              onClick={e => {
                e.stopPropagation();
                onLoadMore();
              }}
              className="w-full mt-3 sm:mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              더보기 ({visibleCount}/{totalCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
