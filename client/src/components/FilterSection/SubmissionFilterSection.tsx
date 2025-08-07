// SubmissionFilterSection.tsx
import { useState, useEffect } from 'react';

interface SubmissionFilterSectionProps {
  activeTab: 'all' | 'mode_300' | 'mode_1000';
  setActiveTab: (tab: 'all' | 'mode_300' | 'mode_1000') => void;
  feedbackFilter: string | null;
  setFeedbackFilter: (filter: string | null) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    mode_300: number;
    mode_1000: number;
    has_feedback: number;
    open_feedback: number;
    locked_feedback: number;
  };
}

export const SubmissionFilterSection: React.FC<SubmissionFilterSectionProps> = ({
  activeTab,
  setActiveTab,
  feedbackFilter,
  setFeedbackFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,
  counts,
}) => {
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState(false);

  // handleFeedbackFilterToggle 함수 활성화
  const handleFeedbackFilterToggle = (filter: string) => {
    setFeedbackFilter(feedbackFilter === filter ? null : filter);
  };

  const modeLabelMap = {
    all: '전체',
    mode_300: '300자',
    mode_1000: '1000자',
  };

  const modeCountMap = {
    all: counts.all,
    mode_300: counts.mode_300,
    mode_1000: counts.mode_1000,
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 border border-gray-100 dark:border-gray-700">
      {/* 📱 모바일 필터 토글 */}
      <div className="sm:hidden mb-2 flex items-center justify-between">
        <h3 className="sm:text-lg font-semibold text-gray-700 dark:text-gray-200">🔍 필터</h3>
        <button
          onClick={() => setIsMobileFilterExpanded(!isMobileFilterExpanded)}
          className="text-lg text-gray-600 dark:text-gray-300"
        >
          {isMobileFilterExpanded ? '▼' : '▶'}
        </button>
      </div>

      {(isMobileFilterExpanded || (typeof window !== 'undefined' && window.innerWidth >= 640)) && (
        <>
          {/* 필터 버튼 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-2 sm:mb-3">
            {(['all', 'mode_300', 'mode_1000'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeTab === mode
                    ? 'bg-blue-500 text-white dark:bg-blue-900/80 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {
                  {
                    all: '전체',
                    mode_300: '300자',
                    mode_1000: '1000자',
                  }[mode]
                }
                <span className="text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {{
                    all: counts.all,
                    mode_300: counts.mode_300,
                    mode_1000: counts.mode_1000,
                  }[mode] ?? 0}
                </span>
              </button>
            ))}

            <span className="hidden sm:inline mx-2">|</span>

            {(
              [
                ['has_feedback', '💬 피드백 있음', counts.has_feedback],
                ['open_feedback', '🔓 열린 피드백', counts.open_feedback],
                ['locked_feedback', '🔒 잠긴 피드백', counts.locked_feedback],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  feedbackFilter === key
                    ? 'bg-green-500 text-white dark:bg-green-900/80 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
                onClick={() => handleFeedbackFilterToggle(key)}
              >
                {label}
                <span className="text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {count || 0}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 🔍 검색창 + 정렬 (모바일 한줄 7:2:1, 데스크탑 유지) */}
      <div className="flex flex-row gap-2 items-stretch w-full">
        {/* 검색창 */}
        <div className="flex-[7] sm:flex-[14] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제목이나 내용으로 검색"
            className="w-full h-full px-3 py-2 pl-9 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-300 dark:text-gray-700 dark:border-gray-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {/* 드롭다운 */}
        <div className="flex-[2] sm:w-[160px]">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="w-full h-full px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-300 dark:text-gray-700 dark:border-gray-600"
          >
            <option value="date">작성일순</option>
            <option value="feedback">피드백순</option>
            <option value="likes">좋아요순</option>
          </select>
        </div>

        {/* 정렬 버튼 */}
        <div className="flex-[1] sm:w-[60px]">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="w-full h-full px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm dark:bg-gray-300 dark:text-gray-700 dark:border-gray-600"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );
};
