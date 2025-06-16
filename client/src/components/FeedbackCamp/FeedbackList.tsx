// feedbacklist.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Submission } from './types';
import { CONFIG } from '../../config';
import HelpfulButton from '../HelpfulButton';
import { useUser } from '../../context/UserContext';
import ScrollToTop from '../ScrollToTop';

interface FeedbackListProps {
  submissions: Submission[];
  feedbacks: { [id: string]: string };
  expanded: string | null;
  submittedIds: string[];
  onFeedbackChange: (id: string, value: string) => void;
  onSubmitFeedback: (id: string, e: React.MouseEvent) => void;
  onToggleExpand: (id: string) => void;
  loading?: boolean;
  lastSubmissionElementRef?: (node: HTMLDivElement | null) => void;
  totalAvailable: number;
  isLoadingMore: boolean;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  submissions,
  feedbacks,
  expanded,
  submittedIds,
  onFeedbackChange,
  onSubmitFeedback,
  onToggleExpand,
  loading = false,
  lastSubmissionElementRef,
  totalAvailable,
  isLoadingMore,
}) => {
  const [isListExpanded, setIsListExpanded] = useState(true);
  const { user } = useUser();
  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700">
      {/* 헤더 섹션 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsListExpanded(!isListExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold dark:text-gray-300">
            📝 피드백 대상 글
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-300">({totalAvailable})</span>
        </div>
        <span className="text-gray-400 text-lg dark:text-gray-300 dark:hover:text-gray-100">
          {isListExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* 피드백 목록 */}
      {isListExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {submissions.map((submission, index) => {
            const isLast = index === submissions.length - 1;
            return (
              <div
                key={submission._id}
                ref={isLast ? lastSubmissionElementRef : undefined}
                className="border rounded-lg dark:bg-gray-600 dark:border-gray-700"
              >
                {/* 글 헤더 - 항상 보이는 부분 */}
                <div
                  className="p-3 sm:p-4 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-700"
                  onClick={() => onToggleExpand(submission._id)}
                >
                  <div className="flex flex-col items-start gap-1">
                    {/* 1. 제목 + 주제(데스크탑), 제목만(모바일) */}
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-medium text-gray-900 break-all line-clamp-1 dark:text-gray-300">
                        {submission.title}
                      </h4>
                      {/* 데스크탑(중간 이상)에서만 주제 표시 */}
                      {submission.topic && (
                        <span className="hidden sm:inline-block text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full dark:text-gray-300">
                          {submission.topic}
                        </span>
                      )}
                    </div>
                    {/* 모바일(소형)에서는 주제만 별도 줄에 표시, 텍스트 길이만큼만 배경 */}
                    {submission.topic && (
                      <span className="inline-block sm:hidden text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full mb-1 dark:text-gray-300">
                        {submission.topic}
                      </span>
                    )}
                    {/* 3. 기타 정보 */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1 dark:text-gray-300">
                      <span>{submission.user.displayName || '익명'}</span>
                      <span className="text-gray-400 dark:text-gray-300">•</span>
                      <span>
                        {format(new Date(submission.createdAt || ''), 'PPP', { locale: ko })}
                      </span>
                      <div className="flex items-center gap-2">
                        <HelpfulButton submissionId={submission._id} userUid={user?.uid} />
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <span className="text-sm">💬</span>
                          <span className="text-sm">{submission.feedbackCount || 0}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.mode === 'mode_300'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300'
                        }`}
                      >
                        {submission.mode === 'mode_300' ? '300자' : '1000자'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 글 상세 내용 및 피드백 폼 */}
                {expanded === submission._id && (
                  <div className="border-t border-gray-100 dark:border-gray-500">
                    <div className="p-3 sm:p-4">
                      {/* 원문 */}
                      <div className="mb-3 sm:mb-4">
                        <div className="text-xs text-gray-500 mb-1 dark:text-gray-300">원문</div>
                        <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 break-all dark:text-gray-300">
                          {submission.text}
                        </div>
                      </div>

                      {/* 피드백 작성 폼 */}
                      {!submittedIds.includes(submission._id) && (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="text-xs text-gray-500 dark:text-gray-300">
                            피드백 작성
                          </div>
                          <textarea
                            value={feedbacks[submission._id] || ''}
                            onChange={e => onFeedbackChange(submission._id, e.target.value)}
                            placeholder={`${CONFIG.FEEDBACK.MIN_LENGTH}자 이상의 피드백을 작성해주세요.`}
                            className="w-full h-24 sm:h-32 p-2 sm:p-3 text-sm sm:text-base border dark:border-gray-500
                            rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                            dark:bg-gray-700 dark:text-gray-300 dark:focus:ring-blue-600 dark:focus:border-transparent"
                            disabled={loading}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                              {(feedbacks[submission._id] || '').length}자 / 최소{' '}
                              {CONFIG.FEEDBACK.MIN_LENGTH}자
                            </span>
                            <button
                              onClick={e => onSubmitFeedback(submission._id, e)}
                              disabled={
                                loading ||
                                (feedbacks[submission._id] || '').length <
                                  CONFIG.FEEDBACK.MIN_LENGTH
                              }
                              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm 
                                bg-blue-500 text-white rounded-lg 
                                hover:bg-blue-600 
                                disabled:bg-gray-300 disabled:cursor-not-allowed 
                                transition-colors flex items-center gap-2 
                                dark:bg-gray-700 dark:hover:bg-blue-800 
                                dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
                            >
                              {loading ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  제출 중...
                                </>
                              ) : (
                                '피드백 제출'
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 이미 피드백을 작성한 경우 */}
                      {submittedIds.includes(submission._id) && (
                        <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-300">
                          ✅ 피드백이 제출되었습니다
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 피드백 대상 글이 없는 경우 */}
          {submissions.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-300">
              현재 피드백할 수 있는 글이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 로딩 인디케이터 추가 */}
      {isLoadingMore && (
        <div className="text-center py-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">더 불러오는 중...</p>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
};
