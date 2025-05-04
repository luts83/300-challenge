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
  const handleFeedbackFilterToggle = (filter: string) => {
    if (feedbackFilter === filter) {
      setFeedbackFilter(null);
    } else {
      setFeedbackFilter(filter);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-3">
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

        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            feedbackFilter === 'has_feedback'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => handleFeedbackFilterToggle('has_feedback')}
        >
          💬 피드백 있음
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              feedbackFilter === 'has_feedback' ? 'bg-white/20' : 'bg-gray-500/20'
            }`}
          >
            {counts.has_feedback}
          </span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            feedbackFilter === 'open_feedback'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => handleFeedbackFilterToggle('open_feedback')}
        >
          🔓 열린 피드백
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              feedbackFilter === 'open_feedback' ? 'bg-white/20' : 'bg-gray-500/20'
            }`}
          >
            {counts.open_feedback}
          </span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            feedbackFilter === 'locked_feedback'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => handleFeedbackFilterToggle('locked_feedback')}
        >
          🔒 잠긴 피드백
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              feedbackFilter === 'locked_feedback' ? 'bg-white/20' : 'bg-gray-500/20'
            }`}
          >
            {counts.locked_feedback}
          </span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="제목이나 내용으로 검색"
            className="w-full px-3 py-2 pl-9 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        <div className="flex shrink-0 gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">작성일순</option>
            <option value="feedback">피드백순</option>
            <option value="likes">좋아요순</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );
};
