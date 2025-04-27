import React from 'react';

type SortControlsProps = {
  sortBy: 'date' | 'score' | 'feedback';
  setSortBy: (sort: 'date' | 'score' | 'feedback') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  customSortOptions?: Array<{ value: string; label: string }>;
};

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  customSortOptions,
}) => {
  return (
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
  );
};
