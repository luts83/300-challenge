// src/components/FeedbackCamp/FeedbackFilterSection.tsx
interface FeedbackFilterSectionProps {
  activeTab: 'all' | 'mode_300' | 'mode_1000';
  setActiveTab: (tab: 'all' | 'mode_300' | 'mode_1000') => void;
  viewMode: 'all' | 'written' | 'available';
  setViewMode: (mode: 'all' | 'written' | 'available') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  counts: {
    all: number;
    mode_300: number;
    mode_1000: number;
    written: number;
    available: number;
  };
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
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-3">
        {/* activeTab 버튼 */}
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('all')}
        >
          전체
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts.all}</span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'mode_300'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('mode_300')}
        >
          300자
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts.mode_300}</span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'mode_1000'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('mode_1000')}
        >
          1000자
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts.mode_1000}</span>
        </button>

        <div className="hidden sm:block mx-1">|</div>

        {/* viewMode 버튼 */}
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'all'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setViewMode('all')}
        >
          전체 보기
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'written'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setViewMode('written')}
        >
          작성한 피드백
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts.written}</span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            viewMode === 'available'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setViewMode('available')}
        >
          피드백 가능한 글
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{counts.available}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제목이나 내용으로 검색"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">작성일순</option>
            <option value="feedback">피드백순</option>
            <option value="likes">좋아요순</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );
};
