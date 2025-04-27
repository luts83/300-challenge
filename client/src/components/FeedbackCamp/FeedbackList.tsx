import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Submission } from './types';
import { CONFIG } from '../../config';

interface FeedbackListProps {
  submissions: Submission[];
  feedbacks: { [id: string]: string };
  expanded: string | null;
  submittedIds: string[];
  onFeedbackChange: (id: string, value: string) => void;
  onSubmitFeedback: (id: string, e: React.MouseEvent) => void;
  onToggleExpand: (id: string) => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  submissions,
  feedbacks,
  expanded,
  submittedIds,
  onFeedbackChange,
  onSubmitFeedback,
  onToggleExpand,
}) => {
  const [isListExpanded, setIsListExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      {/* 헤더 섹션 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsListExpanded(!isListExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold">📝 피드백 대상 글</h3>
          <span className="text-sm text-gray-500">({submissions.length})</span>
        </div>
        <span className="text-gray-400 text-lg">{isListExpanded ? '▼' : '▶'}</span>
      </div>

      {/* 피드백 목록 */}
      {isListExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {submissions.map(submission => (
            <div key={submission._id} className="border rounded-lg">
              {/* 글 헤더 - 항상 보이는 부분 */}
              <div
                className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onToggleExpand(submission._id)}
              >
                <div className="flex flex-col gap-1">
                  {/* 제목 */}
                  <h4 className="text-base font-medium text-gray-900 break-all line-clamp-1">
                    {submission.title}
                  </h4>

                  {/* 메타 정보 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{submission.user.displayName || '익명'}</span>
                      <span className="text-gray-400">•</span>
                      <span>
                        {format(new Date(submission.createdAt || ''), 'PPP', { locale: ko })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.mode === 'mode_300'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {submission.mode === 'mode_300' ? '300자' : '1000자'}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {expanded === submission._id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 글 상세 내용 및 피드백 폼 */}
              {expanded === submission._id && (
                <div className="border-t border-gray-100">
                  <div className="p-3 sm:p-4">
                    {/* 원문 */}
                    <div className="mb-3 sm:mb-4">
                      <div className="text-xs text-gray-500 mb-1">원문</div>
                      <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 break-all">
                        {submission.text}
                      </div>
                    </div>

                    {/* 피드백 작성 폼 */}
                    {!submittedIds.includes(submission._id) && (
                      <div className="space-y-2 sm:space-y-3">
                        <div className="text-xs text-gray-500">피드백 작성</div>
                        <textarea
                          value={feedbacks[submission._id] || ''}
                          onChange={e => onFeedbackChange(submission._id, e.target.value)}
                          placeholder={`${CONFIG.FEEDBACK.MIN_LENGTH}자 이상의 피드백을 작성해주세요.`}
                          className="w-full h-24 sm:h-32 p-2 sm:p-3 text-sm sm:text-base border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-500">
                            {(feedbacks[submission._id] || '').length}자 / 최소{' '}
                            {CONFIG.FEEDBACK.MIN_LENGTH}자
                          </span>
                          <button
                            onClick={e => onSubmitFeedback(submission._id, e)}
                            disabled={
                              (feedbacks[submission._id] || '').length < CONFIG.FEEDBACK.MIN_LENGTH
                            }
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            피드백 제출
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 이미 피드백을 작성한 경우 */}
                    {submittedIds.includes(submission._id) && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        ✅ 피드백이 제출되었습니다
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 피드백 대상 글이 없는 경우 */}
          {submissions.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              현재 피드백할 수 있는 글이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
