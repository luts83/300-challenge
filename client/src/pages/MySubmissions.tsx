// src/pages/MySubmissions.tsx
import React, { useEffect, useState, Component, ErrorInfo, useMemo } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import FeedbackMissionPanel from '../components/FeedbackMissionPanel';
import { useNavigate, useLocation } from 'react-router-dom';

type Submission = {
  _id: string;
  title: string;
  text: string;
  score: number | null;
  feedback: string;
  createdAt: string;
  mode: 'mode_300' | 'mode_1000';
  feedbackUnlocked?: boolean;
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

type FeedbackStats = {
  totalSubmissions: number;
  unlockedSubmissions: number;
  feedbackGiven: number;
  feedbackReceived: number;
  unlockRate: number;
};

// 상단에 이모지 상수 정의
const ICONS = {
  AI: '🤖',
  FEEDBACK: '💬',
  LOCK: '🔒',
  SCORE: '🎯',
} as const;

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
  const { user, loading: authLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [receivedFeedbackData, setReceivedFeedbackData] = useState<{
    totalWritten: number;
    groupedBySubmission: FeedbackItem[];
  }>({ totalWritten: 0, groupedBySubmission: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const [noSubmissions, setNoSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mode_300' | 'mode_1000'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [feedbackStats, setFeedbackStats] = useState<{
    totalWritten: number;
    groupedBySubmission: FeedbackItem[];
  }>({ totalWritten: 0, groupedBySubmission: [] });
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '3months'>('all');
  const [weeklyGrowth, setWeeklyGrowth] = useState({ submissions: 0 });
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'mode_300' | 'mode_1000'>('mode_300');
  const [isStarted, setIsStarted] = useState(false);
  const [todayFeedbackCount, setTodayFeedbackCount] = useState(0);

  const canSubmit = useMemo(() => {
    return (
      text.length >= (mode === 'mode_300' ? 100 : 300) && // 최소 글자 수
      text.length <= (mode === 'mode_300' ? 300 : 1000) && // 최대 글자 수
      title.trim().length > 0 && // 제목 필수
      title.length <= 50 && // 제목 최대 길이
      isStarted // 타이머 시작됨
    );
  }, [text.length, title, isStarted, mode]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!title.trim()) {
        alert('제목을 입력해주세요.');
        return;
      }
      // ... 다른 유효성 검사
      return;
    }

    try {
      // ... 제출 로직
    } catch (err) {
      console.error('제출 실패:', err);
      alert('제출에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchAll = async () => {
      setIsLoading(true);

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
        console.error(' 💬피드백 조회 실패:', err);
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/stats/${user.uid}`
        );
        setFeedbackStats(res.data);
      } catch (err) {
        console.error('📊 피드백 통계 조회 실패:', err);
      }

      setIsLoading(false);
    };

    fetchAll();
  }, [user, authLoading]);

  useEffect(() => {
    const fetchTodayFeedbackCount = async () => {
      if (!user) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`
        );
        setTodayFeedbackCount(res.data.count);
      } catch (err) {
        console.error('오늘의 피드백 개수 불러오기 실패:', err);
      }
    };

    fetchTodayFeedbackCount();
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
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return sortOrder === 'desc'
          ? (b.score || 0) - (a.score || 0)
          : (a.score || 0) - (b.score || 0);
      }
    });

  if (!user) {
    return <p className="msg-auth">로그인이 필요합니다.</p>;
  }

  if (authLoading) {
    return <p className="msg-auth">로딩 중...</p>;
  }

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
        {/* 제목 */}
        <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">📝 내가 쓴 글</h1>

        {/* 🔔 알림 메시지 */}
        <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-base text-center font-medium">
          ✍ 글을 쓰고 다른 사용자에게 피드백을 3개 작성하면, 내가 쓴 글의 피드백을 볼 수 있어요!
        </div>

        {/* 통계 섹션 */}
        {isLoading ? (
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
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            >
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>📊</span> 작성한 글 통계
              </h2>
              <button className="sm:hidden p-2 hover:bg-gray-50 rounded-full transition-colors">
                {isStatsExpanded ? '▲' : '▼'}
              </button>
            </div>

            <div className={`${isStatsExpanded ? 'block' : 'hidden'} sm:block mt-6`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 300자 통계 카드 */}
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900">300자 글쓰기</h3>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      총 {stats.mode_300?.count || 0}개
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 점수 섹션 */}
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="mb-2">
                        <div className="inline-block p-2 bg-blue-50 rounded-full">
                          <span className="text-blue-600 text-xl">
                            {(stats.mode_300?.averageScore || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">평균 점수</p>
                    </div>

                    {/* 최고 점수 섹션 */}
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="mb-2">
                        <div className="inline-block p-2 bg-green-50 rounded-full">
                          <span className="text-green-600 text-xl">
                            {stats.mode_300?.maxScore || 0}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">최고 점수</p>
                    </div>
                  </div>

                  {/* 추가 정보 */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">평균 작성 시간</span>
                      <span className="font-medium">
                        {Math.floor((stats.mode_300?.averageDuration || 0) / 60)}분{' '}
                        {Math.floor((stats.mode_300?.averageDuration || 0) % 60)}초
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">최근 작성일</span>
                      <span className="font-medium">
                        {stats.mode_300?.recentDate
                          ? new Date(stats.mode_300.recentDate).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1000자 통계 카드 */}
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-purple-900">1000자 글쓰기</h3>
                    <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                      총 {stats.mode_1000?.count || 0}개
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* 점수 섹션 */}
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="mb-2">
                        <div className="inline-block p-2 bg-purple-50 rounded-full">
                          <span className="text-purple-600 text-xl">
                            {(stats.mode_1000?.averageScore || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">평균 점수</p>
                    </div>

                    {/* 최고 점수 섹션 */}
                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                      <div className="mb-2">
                        <div className="inline-block p-2 bg-green-50 rounded-full">
                          <span className="text-green-600 text-xl">
                            {stats.mode_1000?.maxScore || 0}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">최고 점수</p>
                    </div>
                  </div>

                  {/* 추가 정보 */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">평균 작성 시간</span>
                      <span className="font-medium">
                        {Math.floor((stats.mode_1000?.averageDuration || 0) / 60)}분{' '}
                        {Math.floor((stats.mode_1000?.averageDuration || 0) % 60)}초
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">평균 완성 횟수</span>
                      <span className="font-medium">
                        {stats.mode_1000?.averageSessionCount || 0}회
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">최근 작성일</span>
                      <span className="font-medium">
                        {stats.mode_1000?.recentDate
                          ? new Date(stats.mode_1000.recentDate).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 모바일에서 접혀있을 때 보여주는 간단한 통계 */}
            <div className={`${!isStatsExpanded ? 'block' : 'hidden'} sm:hidden mt-4`}>
              <div className="flex justify-between items-center">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 mb-1">300자</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {(stats.mode_300?.averageScore || 0).toFixed(1)}
                    <span className="text-sm">점</span>
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900 mb-1">1000자</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {(stats.mode_1000?.averageScore || 0).toFixed(1)}
                    <span className="text-sm">점</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 📈 피드백 활동 통계 */}
        {feedbackStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📊 피드백 활동</h2>
              {/* 기간 선택 필터 추가 */}
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                onChange={e => setTimeFilter(e.target.value)}
                defaultValue="all"
              >
                <option value="all">전체 기간</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="3months">최근 3개월</option>
              </select>
            </div>

            {/* 데스크탑 뷰 - 관계성 있는 지표 그룹화 */}
            <div className="hidden sm:grid grid-cols-2 gap-4 mb-4">
              {/* 글 작성 현황 그룹 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">글 작성 현황</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/80 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📝</span>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {feedbackStats.totalSubmissions}
                        </p>
                        <p className="text-xs text-gray-600">작성한 글</p>
                      </div>
                    </div>
                    {/* 전주 대비 증감 표시 */}
                    <p className="text-xs text-green-600 mt-2">
                      +{weeklyGrowth.submissions} 이번 주
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔓</span>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {feedbackStats.unlockedSubmissions}
                        </p>
                        <p className="text-xs text-gray-600">언락된 글</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full">
                      <div
                        className="h-1 bg-green-500 rounded-full"
                        style={{
                          width: `${(feedbackStats.unlockedSubmissions / feedbackStats.totalSubmissions) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 피드백 교류 현황 그룹 */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">피드백 교류 현황</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/80 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✍️</span>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {feedbackStats.feedbackGiven}
                        </p>
                        <p className="text-xs text-gray-600">작성한 피드백</p>
                      </div>
                    </div>
                    {/* 일일 목표 달성률 */}
                    <p className="text-xs text-purple-600 mt-2">오늘 {dailyFeedbackCount}/3 완료</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💬</span>
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {feedbackStats.feedbackReceived}
                        </p>
                        <p className="text-xs text-gray-600">받은 피드백</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      평균{' '}
                      {(feedbackStats.feedbackReceived / feedbackStats.totalSubmissions).toFixed(1)}
                      개/글
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 모바일 뷰 - 컴팩트한 카드 형태 유지하되 관계성 표시 */}
            <div className="sm:hidden space-y-3">
              {/* 글 작성 현황 그룹 */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="text-xs font-medium text-gray-600 mb-2">글 작성 현황</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📝</span>
                      <div>
                        <p className="text-base font-bold text-blue-600">
                          {feedbackStats.totalSubmissions}
                        </p>
                        <p className="text-xs text-gray-600">작성한 글</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔓</span>
                      <div>
                        <p className="text-base font-bold text-green-600">
                          {feedbackStats.unlockedSubmissions}
                        </p>
                        <p className="text-xs text-gray-600">언락된 글</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 피드백 교류 현황 그룹 */}
              <div className="bg-purple-50 rounded-lg p-3">
                <h3 className="text-xs font-medium text-gray-600 mb-2">피드백 교류 현황</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">✍️</span>
                      <div>
                        <p className="text-base font-bold text-purple-600">
                          {feedbackStats.feedbackGiven}
                        </p>
                        <p className="text-xs text-gray-600">작성한 피드백</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💬</span>
                      <div>
                        <p className="text-base font-bold text-red-600">
                          {feedbackStats.feedbackReceived}
                        </p>
                        <p className="text-xs text-gray-600">받은 피드백</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 전체 활동 요약 - 공통 */}
            <div className="mt-4 bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">전체 활동 요약</h3>
                <span className="text-xs text-gray-500">달성률 {feedbackStats.unlockRate}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                      style={{ width: `${feedbackStats.unlockRate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    글당 평균{' '}
                    {(feedbackStats.feedbackReceived / feedbackStats.totalSubmissions).toFixed(1)}개
                    피드백
                  </span>
                  <span>일일 피드백 {dailyFeedbackCount}/3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 피드백 미션 현황 */}
        {/* <FeedbackMissionPanel /> */}

        {/* 피드백 현황 */}
        {/* <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl sm:text-lg font-semibold mb-3 flex items-center gap-2">
            🗣 받은 피드백 현황
            <span className="text-sm font-normal text-gray-500">
              (총 {receivedFeedbackData.groupedBySubmission.length}개)
            </span>
          </h2> */}

        {/* 피드백 열람 규칙 설명 */}
        {/* <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-base font-medium text-blue-800 mb-2">📋 피드백 열람 규칙</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  각 글마다 3개의 피드백을 작성하면 해당 글에 달린 피드백을 영구적으로 볼 수 있어요.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  현재까지 작성한 피드백: {receivedFeedbackData.totalWritten}개
                  {receivedFeedbackData.totalWritten < CONFIG.FEEDBACK.REQUIRED_COUNT && (
                    <span className="text-blue-800 font-medium">
                      {' '}
                      (앞으로 {CONFIG.FEEDBACK.REQUIRED_COUNT - receivedFeedbackData.totalWritten}개
                      더 필요해요!)
                    </span>
                  )}
                </span>
              </li>
            </ul>
          </div> */}

        {/* 글별 피드백 현황 */}
        {/* <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <SubmissionItem key={submission._id} submission={submission} />
            ))}
          </div>
        </div> */}

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
          <div className="space-y-4">
            {filteredSubmissions.slice(0, visibleCount).map(item => {
              const isExpanded = expandedId === item._id;
              const feedbacksForThis = getFeedbacksForSubmission(item._id);
              const hasFeedback = feedbacksForThis.length > 0;
              const canViewFeedback = item.feedbackUnlocked === true;

              return (
                <div
                  key={item._id}
                  className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                    hasFeedback
                      ? 'border-l-4 border-l-blue-500 border-t-0 border-r-0 border-b-0'
                      : 'border border-gray-100'
                  }`}
                >
                  {/* 카드 헤더 - 항상 보이는 영역 */}
                  <div className="p-4 cursor-pointer" onClick={() => toggleExpand(item._id)}>
                    {/* 메타 정보 (모드, 주제, 날짜, 점수) */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        {/* 모드 */}
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            item.mode === 'mode_300'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-green-50 text-green-600'
                          }`}
                        >
                          {item.mode === 'mode_300' ? '300자' : '1000자'}
                        </span>

                        {/* 주제 */}
                        <span className="text-gray-600">{item.topic || '자유주제'}</span>

                        {/* 날짜 */}
                        <span className="text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>

                      {/* 점수와 피드백 수 (오른쪽 끝) */}
                      <div className="flex items-center gap-2">
                        {item.score !== null && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <span aria-label="score">{ICONS.SCORE}</span>
                            {item.score}점
                          </span>
                        )}
                        {hasFeedback && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full text-sm text-blue-600">
                            <span aria-label="feedback">{ICONS.FEEDBACK}</span>
                            {feedbacksForThis.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                  </div>

                  {/* 확장 영역 - 클릭시 보이는 영역 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* 본문 */}
                      <div className="p-4 bg-gray-50">
                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                          {item.text}
                        </p>
                      </div>

                      {/* AI 피드백 */}
                      {item.feedback && (
                        <div className="p-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span aria-label="AI">{ICONS.AI}</span>
                            <h4 className="text-sm font-medium text-gray-900">AI 피드백</h4>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3">
                            <p className="text-gray-800">{item.feedback}</p>
                          </div>
                        </div>
                      )}

                      {/* 사용자 피드백 */}
                      {hasFeedback && (
                        <div className="p-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span aria-label="feedback">{ICONS.FEEDBACK}</span>
                              <h4 className="text-sm font-medium text-gray-900">받은 피드백</h4>
                            </div>
                          </div>

                          {canViewFeedback ? (
                            <div className="space-y-2">
                              {feedbacksForThis.map((fb, index) => (
                                <div key={index} className="bg-blue-50 rounded-lg p-3">
                                  <p className="text-gray-800 mb-2">{fb.content}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{fb.user?.displayName || '익명'}</span>
                                    <span>
                                      {new Date(fb.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-yellow-50 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span aria-label="lock">{ICONS.LOCK}</span>
                                <p className="text-sm text-yellow-700">
                                  {CONFIG.FEEDBACK.REQUIRED_COUNT}개의 피드백을 작성하면 볼 수
                                  있어요!
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 더보기 버튼 */}
            {filteredSubmissions.length > visibleCount && (
              <button
                className="w-full py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
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
