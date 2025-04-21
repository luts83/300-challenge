// src/pages/MySubmissions.tsx
import React, { useEffect, useState, Component, ErrorInfo } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

type Submission = {
  _id: string;
  text: string;
  score: number | null;
  feedback: string;
  submittedAt: string;
  mode: 'mode_300' | 'mode_1000';
};

type FeedbackItem = {
  toSubmissionId: string | null;
  content: string;
  createdAt: string;
};

type Stats = {
  mode_300?: {
    count: number;
    averageScore: number;
    maxScore: number;
    recentDate: string;
    averageDuration: number;
  };
  mode_1000?: {
    count: number;
    averageScore: number;
    maxScore: number;
    recentDate: string;
    averageDuration: number;
    averageSessionCount: number;
  };
};

// 에러 바운더리 컴포넌트
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('에러 바운더리:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <p className="text-error">오류가 발생했습니다. 새로고침해 주세요.</p>;
    }
    return this.props.children;
  }
}

const MySubmissions = () => {
  const { user } = useUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [receivedFeedbackData, setReceivedFeedbackData] = useState<{
    totalWritten: number;
    groupedBySubmission: FeedbackItem[];
  }>({ totalWritten: 0, groupedBySubmission: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [noSubmissions, setNoSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mode_300' | 'mode_1000'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);

      try {
        const subRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`
        );
        if (subRes.data.length === 0) {
          setNoSubmissions(true);
          setSubmissions([]);
        } else {
          setNoSubmissions(false);
          setSubmissions(subRes.data);
        }
      } catch (err) {
        console.error('📭 작성한 글 조회 실패:', err);
        setNoSubmissions(true);
      }

      try {
        const statRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/stats/${user.uid}`);
        setStats(statRes.data);
      } catch (err) {
        console.error('📉 통계 조회 실패:', err);
      }

      try {
        const fbRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/received/${user.uid}`
        );
        setReceivedFeedbackData(fbRes.data);
      } catch (err) {
        console.error('💬 피드백 조회 실패:', err);
      }

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getFeedbacksForSubmission = (submissionId: string): FeedbackItem[] => {
    return receivedFeedbackData.groupedBySubmission.filter(
      fb => fb.toSubmissionId && fb.toSubmissionId.toString() === submissionId.toString()
    );
  };

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  const filteredSubmissions = submissions
    .filter(submission => {
      if (activeTab === 'all') return true;
      return submission.mode === activeTab;
    })
    .filter(submission => submission.text.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else {
        return sortOrder === 'desc'
          ? (b.score || 0) - (a.score || 0)
          : (a.score || 0) - (b.score || 0);
      }
    });

  if (!user) return <p className="msg-auth">로그인이 필요합니다.</p>;
  if (loading) return <p className="msg-auth">로딩 중...</p>;
  if (noSubmissions) {
    return (
      <p className="msg-submit-note">
        ✍ 아직 글을 작성하지 않으셨어요.
        <br />
        매일 한 편씩 도전해 보세요!
      </p>
    );
  }
  if (error) return <p className="msg-error">{error}</p>;

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-4">
        {/* 🔔 알림 메시지 */}
        {receivedFeedbackData.totalWritten >= CONFIG.FEEDBACK.REQUIRED_COUNT &&
          receivedFeedbackData.groupedBySubmission.length > 0 && (
            <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-base text-center font-medium">
              ✅ 피드백 3개를 작성해 주셔서 감사해요! 이제 받은 피드백을 열람할 수 있습니다!
            </div>
          )}

        {/* 제목 */}
        <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">📝 내가 쓴 글</h1>

        {/* 통계 섹션 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            >
              <h2 className="text-xl sm:text-lg font-semibold">📊 작성한 글 통계</h2>
              <span className="sm:hidden">{isStatsExpanded ? '▲' : '▼'}</span>
            </div>
            <div className={`${isStatsExpanded ? 'block' : 'hidden'} sm:block`}>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4 text-lg sm:text-base">300자 글쓰기</h3>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-gray-900">
                      총 글 수: {stats.mode_300?.count || 0}
                    </p>
                    <p className="text-base font-medium text-blue-600">
                      평균 점수: {(stats.mode_300?.averageScore || 0).toFixed(1)}점
                    </p>
                    <p className="text-base font-medium text-green-600">
                      최고 점수: {stats.mode_300?.maxScore || 0}점
                    </p>
                    <p className="text-base text-gray-700">
                      평균 작성 시간: {Math.floor((stats.mode_300?.averageDuration || 0) / 60)}분{' '}
                      {Math.floor((stats.mode_300?.averageDuration || 0) % 60)}초
                    </p>
                    <p className="text-sm text-gray-500">
                      최근 작성일:{' '}
                      {stats.mode_300?.recentDate
                        ? new Date(stats.mode_300.recentDate).toLocaleDateString('ko-KR')
                        : '작성한 글 없음'}
                    </p>
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-4 text-lg sm:text-base">1000자 글쓰기</h3>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-gray-900">
                      총 글 수: {stats.mode_1000?.count || 0}
                    </p>
                    <p className="text-base font-medium text-blue-600">
                      평균 점수: {(stats.mode_1000?.averageScore || 0).toFixed(1)}점
                    </p>
                    <p className="text-base font-medium text-green-600">
                      최고 점수: {stats.mode_1000?.maxScore || 0}점
                    </p>
                    <p className="text-base text-gray-700">
                      평균 작성 시간: {Math.floor((stats.mode_1000?.averageDuration || 0) / 60)}분{' '}
                      {Math.floor((stats.mode_1000?.averageDuration || 0) % 60)}초
                    </p>
                    <p className="text-base text-gray-700">
                      평균 완성 횟수: {stats.mode_1000?.averageSessionCount || 0}회
                    </p>
                    <p className="text-sm text-gray-500">
                      최근 작성일:{' '}
                      {stats.mode_1000?.recentDate
                        ? new Date(stats.mode_1000.recentDate).toLocaleDateString('ko-KR')
                        : '작성한 글 없음'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* 모바일에서 접혀있을 때 보여주는 간단한 통계 */}
            <div className={`${!isStatsExpanded ? 'block' : 'hidden'} sm:hidden mt-4`}>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-base font-medium text-gray-900">300자</p>
                  <p className="text-base font-medium text-blue-600">
                    {(stats.mode_300?.averageScore || 0).toFixed(1)}점
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-gray-900">1000자</p>
                  <p className="text-base font-medium text-blue-600">
                    {(stats.mode_1000?.averageScore || 0).toFixed(1)}점
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 피드백 현황 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl sm:text-lg font-semibold mb-3">🗣 받은 피드백 현황</h2>
          <div className="space-y-2">
            <p className="text-base text-gray-900">
              💌 {user.displayName} 님은 {receivedFeedbackData.groupedBySubmission.length}
              개의 피드백을 받으셨어요.
            </p>
            {receivedFeedbackData.totalWritten < CONFIG.FEEDBACK.REQUIRED_COUNT ? (
              <p className="text-base text-yellow-600">
                {CONFIG.FEEDBACK.REQUIRED_COUNT}개 이상 피드백을 작성하면 받은 피드백 내용을 볼 수
                있습니다!
              </p>
            ) : receivedFeedbackData.groupedBySubmission.length === 0 ? (
              <p className="text-base text-yellow-600">아직 피드백을 받지 못했습니다.</p>
            ) : null}
          </div>
        </div>

        {/* 필터 및 정렬 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] ${
                  activeTab === 'all'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('all')}
              >
                전체
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] ${
                  activeTab === 'mode_300'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('mode_300')}
              >
                300자 글쓰기
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] ${
                  activeTab === 'mode_1000'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setActiveTab('mode_1000')}
              >
                1000자 글쓰기
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="글 내용 검색..."
                className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-base min-h-[36px]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-base min-h-[36px]"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'date' | 'score')}
                >
                  <option value="date">날짜순</option>
                  <option value="score">점수순</option>
                </select>
                <select
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-base min-h-[36px]"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 글 목록 */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredSubmissions.slice(0, visibleCount).map(item => {
              const isExpanded = expandedId === item._id;
              const preview =
                item.text.length > 100 && !isExpanded ? item.text.slice(0, 50) + '...' : item.text;
              const feedbacksForThis = getFeedbacksForSubmission(item._id);
              const canViewFeedback =
                receivedFeedbackData.totalWritten >= CONFIG.FEEDBACK.REQUIRED_COUNT;
              const hasFeedback = feedbacksForThis.length > 0;

              return (
                <div
                  key={item._id}
                  className={`bg-white/80 rounded-lg shadow-md p-4 sm:p-6 cursor-pointer transition-all duration-200 ${
                    hasFeedback ? 'border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => toggleExpand(item._id)}
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-sm font-medium ${
                            item.mode === 'mode_300'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.mode === 'mode_300' ? '300자' : '1000자'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.submittedAt).toLocaleDateString('ko-KR')}
                        </span>
                        {item.score !== null && (
                          <span className="text-sm font-medium">점수: {item.score}점</span>
                        )}
                      </div>
                      {isExpanded ? (
                        <p className="text-lg text-gray-800 whitespace-pre-line">{item.text}</p>
                      ) : (
                        <p className="text-lg text-gray-800 whitespace-pre-line">
                          {item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text}
                        </p>
                      )}
                    </div>
                    {hasFeedback && (
                      <span className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-full text-sm shadow-sm">
                        💬
                      </span>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                      {/* AI 피드백 섹션 */}
                      {item.score !== null && (
                        <div className="bg-gray-50/80 rounded-lg p-3 sm:p-4">
                          <h4 className="font-semibold mb-2 text-lg">🤖 AI 피드백</h4>
                          <div>
                            <p className="text-blue-600 mb-2 text-lg">📊 점수: {item.score}점</p>
                            <p className="text-gray-700 text-lg">
                              {item.feedback || 'AI 피드백이 없습니다.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 사용자 피드백 섹션 */}
                      {canViewFeedback && hasFeedback && (
                        <div className="bg-gray-50/80 rounded-lg p-3 sm:p-4">
                          <h4 className="font-semibold mb-2 text-lg">🧑‍🤝‍🧑 받은 피드백</h4>
                          {feedbacksForThis.map((fb, index) => (
                            <div key={index} className="mb-3 last:mb-0">
                              <p className="text-gray-700 text-lg">{fb.content}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(fb.createdAt).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 피드백 권한 안내 */}
                      {!canViewFeedback && hasFeedback && (
                        <div className="bg-yellow-50/80 rounded-lg p-3 sm:p-4">
                          <p className="text-yellow-600 text-lg">
                            {CONFIG.FEEDBACK.REQUIRED_COUNT}개 이상 피드백을 작성하면 받은 피드백
                            내용을 볼 수 있습니다!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredSubmissions.length > visibleCount && (
              <button
                className="w-full py-2 sm:py-3 bg-gray-100/80 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base"
                onClick={handleShowMore}
              >
                더보기
              </button>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MySubmissions;
