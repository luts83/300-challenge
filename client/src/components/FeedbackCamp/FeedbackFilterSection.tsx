// src/components/FeedbackCamp/FeedbackFilterSection.tsx
import React, { useState } from 'react';

interface FeedbackFilterSectionProps {
  activeTab: 'all' | 'mode_300' | 'mode_1000';
  setActiveTab: (tab: 'all' | 'mode_300' | 'mode_1000') => void;
  viewMode: 'all' | 'written' | 'available';
  setViewMode: (mode: 'all' | 'written' | 'available') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'date' | 'feedback' | 'recent' | 'likes';
  setSortBy: (sort: 'date' | 'feedback' | 'recent' | 'likes') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  counts: {
    all: number;
    mode_300: number;
    mode_1000: number;
    written: number;
    available: number;
    available_300: number;
    available_1000: number;
  };
  onSearch: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const FeedbackFilterSection: React.FC<FeedbackFilterSectionProps> = ({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  counts,
  onSearch,
  onKeyPress,
}) => {
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState(false);

  const handleSetViewMode = (mode: 'all' | 'written' | 'available') => {
    if (mode === 'written' && counts.written === 0) {
      alert('작성한 피드백이 없습니다.');
      return;
    }
    if (mode === 'available' && counts.available === 0) {
      alert('피드백 가능한 글이 없습니다.');
      return;
    }
    setViewMode(mode);
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 border border-gray-100 dark:border-gray-700">
      {/* 📱 모바일용 필터 토글 */}
      <div className="sm:hidden mb-2 flex items-center justify-between">
        <h3 className="sm:text-lg font-semibold text-gray-700 dark:text-gray-200">🔍 필터</h3>
        <button
          onClick={() => setIsMobileFilterExpanded(!isMobileFilterExpanded)}
          className="text-lg text-gray-600 dark:text-gray-300"
        >
          {isMobileFilterExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 🔄 필터 버튼 (모바일: 토글 시 노출, 데스크탑: 항상 노출) */}
      {(isMobileFilterExpanded || (typeof window !== 'undefined' && window.innerWidth >= 640)) && (
        <>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-2 sm:mb-3">
            {(['all', 'mode_300', 'mode_1000'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
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
                  {
                    {
                      all: counts.all,
                      mode_300: counts.mode_300,
                      mode_1000: counts.mode_1000,
                    }[mode]
                  }
                </span>
              </button>
            ))}

            <span className="hidden sm:inline mx-2">|</span>

            {(['all', 'written', 'available'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleSetViewMode(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === mode
                    ? 'bg-green-500 text-white dark:bg-green-900/80 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {
                  {
                    all: '전체 보기',
                    written: '작성한 피드백',
                    available: '피드백 가능한 글',
                  }[mode]
                }
                <span className="text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {
                    {
                      all: counts.available,
                      written: counts.written,
                      available:
                        activeTab === 'mode_300'
                          ? counts.available_300
                          : activeTab === 'mode_1000'
                            ? counts.available_1000
                            : counts.available,
                    }[mode]
                  }
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-row gap-2 items-stretch w-full">
        {/* 검색창 - 모바일 3/5, 데스크탑 60% */}
        <div className="flex-[7] sm:flex-[14] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="제목, 내용, 작성자명, 이메일로 검색"
            className="w-full h-full px-3 py-2 pl-9 pr-12 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-300 dark:text-gray-700 dark:border-gray-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <button
            onClick={onSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="검색 (Enter)"
          >
            ↵
          </button>
        </div>

        {/* 드롭다운 - 모바일 2/5, 데스크탑 고정 폭 */}
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

        {/* 정렬 버튼 - 모바일 1/5, 데스크탑 고정 폭 */}
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
