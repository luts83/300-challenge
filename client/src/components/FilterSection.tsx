import React from 'react';

type FilterSectionProps = {
  activeTab: 'all' | 'mode_300' | 'mode_1000';
  setActiveTab: (tab: 'all' | 'mode_300' | 'mode_1000') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy?: 'date' | 'score' | 'feedback';
  setSortBy?: (sort: 'date' | 'score' | 'feedback') => void;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: (order: 'asc' | 'desc') => void;
  availableModes?: Set<'mode_300' | 'mode_1000'>;
  showSortOptions?: boolean;
  customSortOptions?: Array<{ value: string; label: string }>;
};

const FilterSection: React.FC<FilterSectionProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  availableModes,
  showSortOptions = false,
  customSortOptions,
}) => {
  const renderModeButton = (mode: typeof activeTab, label: string) => {
    if (availableModes && mode !== 'all' && !availableModes.has(mode)) {
      return null;
    }

    return (
      <button
        key={mode}
        className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] ${
          activeTab === mode
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        onClick={() => setActiveTab(mode)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mb-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {renderModeButton('all', '전체')}
          {renderModeButton('mode_300', '300자 글쓰기')}
          {renderModeButton('mode_1000', '1000자 글쓰기')}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="글 내용 검색..."
            className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-base min-h-[36px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          {showSortOptions && setSortBy && setSortOrder && (
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'date' | 'score' | 'feedback')}
                className="px-3 py-1 border rounded-md text-sm"
              >
                {customSortOptions ? (
                  customSortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="date">날짜순</option>
                    <option value="score">점수순</option>
                  </>
                )}
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
