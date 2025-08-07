import React, { useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

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
  const [listHeight, setListHeight] = useState(400);

  // 주제 카드 렌더링 함수 (메모이제이션 추가)
  const TopicCard = useMemo(() => {
    return React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
      const topic = topics[index];

      if (!topic || !topic.topic) return null;

      const isSelected = selectedTopic === topic.topic;
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
        <div style={style} className="px-2">
          <div
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              isSelected
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
        </div>
      );
    });
  }, [topics, selectedTopic, onTopicSelect]);

  // 무한 스크롤 처리
  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: any) => {
      if (!scrollUpdateWasRequested && hasMore && !loading && onLoadMore) {
        const maxScrollOffset = topics.length * ITEM_HEIGHT - listHeight;
        if (scrollOffset >= maxScrollOffset - 200) {
          // 200px 전에 로드
          onLoadMore();
        }
      }
    },
    [topics.length, hasMore, loading, listHeight, onLoadMore]
  );

  return (
    <div className="h-96 border border-gray-200 dark:border-gray-600 rounded-lg">
      <AutoSizer onResize={({ height }) => setListHeight(height)}>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={topics.length + (hasMore ? 1 : 0)}
            itemSize={ITEM_HEIGHT}
            width={width}
            onScroll={handleScroll}
            overscanCount={3} // 성능 최적화를 위해 줄임
          >
            {({ index, style }) => {
              if (index === topics.length && hasMore) {
                return (
                  <div style={style} className="flex items-center justify-center p-4">
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    ) : (
                      <button
                        onClick={onLoadMore}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        더 보기
                      </button>
                    )}
                  </div>
                );
              }
              return <TopicCard index={index} style={style} />;
            }}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedTopicRanking;
