// feedbacklist.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Submission } from './types';
import { CONFIG } from '../../config';
import HelpfulButton from '../HelpfulButton';
import { useUser } from '../../context/UserContext';
import ScrollToTop from '../ScrollToTop';
import { StructuredFeedbackForm } from './StructuredFeedbackForm';

interface StructuredFeedback {
  strengths: string;
  improvements: string;
  overall: string;
}

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
  onStructuredFeedbackSubmit?: (submissionId: string, feedback: StructuredFeedback) => void;
  isSubmittingFeedback?: boolean;
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
  onStructuredFeedbackSubmit,
  isSubmittingFeedback = false,
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
                className="border rounded-lg dark:bg-gray-800 dark:border-gray-700"
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
                        {submission.createdAt
                          ? new Date(submission.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <HelpfulButton submissionId={submission._id} />
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

                      {/* 구조화된 피드백 작성 폼 */}
                      {!submittedIds.includes(submission._id) && (
                        <StructuredFeedbackForm
                          submissionId={submission._id}
                          onSubmit={(submissionId, feedback) => {
                            if (onStructuredFeedbackSubmit) {
                              onStructuredFeedbackSubmit(submissionId, feedback);
                            }
                          }}
                          loading={isSubmittingFeedback}
                        />
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
        <div className="flex justify-center items-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3 mx-auto"></div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
              더 많은 글을 불러오는 중...
            </p>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
};
