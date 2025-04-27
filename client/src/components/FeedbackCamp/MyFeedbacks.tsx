// src/components/FeedbackCamp/MyFeedbacks.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Feedback } from './types';

interface MyFeedbacksProps {
  feedbacks: Feedback[];
  visibleCount: number;
  onLoadMore: () => void;
  totalCount: number;
}

export const MyFeedbacks: React.FC<MyFeedbacksProps> = ({
  feedbacks,
  visibleCount,
  onLoadMore,
  totalCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      {/* 헤더 섹션 - 클릭하면 접었다 폈다 할 수 있음 */}
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

      {/* 피드백 목록 - 접혀있을 때는 숨김 */}
      {isExpanded && (
        <div className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            {feedbacks.slice(0, visibleCount).map(feedback => (
              <div key={feedback._id} className="border rounded-lg">
                {/* 피드백 헤더 - 항상 보이는 부분 */}
                <div
                  className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setSelectedFeedback(selectedFeedback === feedback._id ? null : feedback._id)
                  }
                >
                  <div className="flex flex-col gap-1">
                    {/* 제목 */}
                    <h4 className="text-base font-medium text-gray-900 break-all line-clamp-1">
                      {feedback.submissionTitle || '(제목 없음)'}
                    </h4>

                    {/* 메타 정보 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{feedback.submissionAuthor?.displayName || '익명'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{format(new Date(feedback.createdAt), 'PPP', { locale: ko })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            feedback.mode === 'mode_300'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {feedback.mode === 'mode_300' ? '300자' : '1000자'}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {selectedFeedback === feedback._id ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 피드백 상세 내용 - 선택했을 때만 보임 */}
                {selectedFeedback === feedback._id && (
                  <div className="border-t border-gray-100">
                    <div className="p-3 sm:p-4">
                      {/* 원문 */}
                      {feedback.submissionText && (
                        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-50 rounded text-sm text-gray-700">
                          <div className="text-xs text-gray-500 mb-1">원문</div>
                          {feedback.submissionText}
                        </div>
                      )}

                      {/* 피드백 내용 */}
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
            ))}
          </div>

          {/* 더보기 버튼 */}
          {visibleCount < totalCount && (
            <button
              onClick={e => {
                e.stopPropagation(); // 상위 요소의 클릭 이벤트 전파 방지
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
