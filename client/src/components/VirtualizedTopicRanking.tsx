import React, { useState, useCallback, useMemo } from 'react';

interface TopicRankingItem {
  topic: string;
  submissionCount: number;
  averageScore: number;
  uniqueUsers: number;
  lastSubmission: string;
}

interface VirtualizedTopicRankingProps {
  topics: TopicRankingItem[];
  onTopicSelect?: (topic: string) => void;
  selectedTopic?: string;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ITEM_HEIGHT = 80; // 각 주제 카드의 높이 (약간 증가)

const VirtualizedTopicRanking: React.FC<VirtualizedTopicRankingProps> = ({
  topics,
  onTopicSelect,
  selectedTopic,
  loading = false,
  onLoadMore,
  hasMore = false,
}) => {
  // 모든 기기에서 안전한 일반 리스트 사용
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // 모든 기기에서 안전한 일반 리스트 사용
  return (
    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
      <div className="space-y-2 p-2">
        {topics.map((topic, index) => {
          const averageScore =
            typeof topic.averageScore === 'number' && !isNaN(topic.averageScore)
              ? topic.averageScore
              : 0;
          const scoreColor =
            averageScore >= 80
              ? 'text-green-600'
              : averageScore >= 60
                ? 'text-yellow-600'
                : 'text-red-600';

          return (
            <div
              key={index}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedTopic === topic.topic
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
              onClick={() => onTopicSelect?.(topic.topic)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {topic.topic}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-lg font-bold ${scoreColor}`}>
                    {typeof averageScore === 'number' && !isNaN(averageScore)
                      ? averageScore.toFixed(1)
                      : '0.0'}
                  </span>
                  <span className="text-xs text-gray-500">점</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-3">
                  <span>📝 {topic.submissionCount || 0}개 글</span>
                  <span>👥 {topic.uniqueUsers || 0}명 참여</span>
                </div>
                <div className="text-xs">
                  {topic.lastSubmission
                    ? new Date(topic.lastSubmission).toLocaleDateString('ko-KR')
                    : '날짜 없음'}
                </div>
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="flex justify-center p-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            ) : (
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                더 보기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedTopicRanking;
