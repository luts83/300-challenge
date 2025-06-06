import React from 'react';

type SearchBarProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <input
      type="text"
      placeholder="글 내용 검색..."
      className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-base min-h-[36px]"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
    />
  );
};
