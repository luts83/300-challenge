// src/pages/MySubmissions.tsx
import React, { useEffect, useState, Component, ErrorInfo, useMemo } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
// import FeedbackMissionPanel from '../components/FeedbackMissionPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import WeeklyProgress from '../components/WeeklyProgress';
import TokenDisplay from '../components/TokenDisplay';
import FilterSection from '../components/FilterSection';
import { logger } from '../utils/logger';
import AIFeedback from '../components/AIFeedback';
import ScrollToTop from '../components/ScrollToTop';

type Submission = {
  _id: string;
  title: string;
  text: string;
  score: number | null;
  feedback: string;
  createdAt: string;
  mode: 'mode_300' | 'mode_1000';
  feedbackUnlocked?: boolean;
  aiFeedback?: string;
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

// FeedbackStats 타입 정의
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
    logger.error('에러 바운더리:', error, errorInfo);
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
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'feedback'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    totalSubmissions: 0,
    unlockedSubmissions: 0,
    feedbackGiven: 0,
    feedbackReceived: 0,
    unlockRate: 0,
  });
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | '3months'>('all');
  const [weeklyGrowth, setWeeklyGrowth] = useState({
    submissions: 0,
    thisWeek: 0,
    lastWeek: 0,
  });
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'mode_300' | 'mode_1000'>('mode_300');
  const [isStarted, setIsStarted] = useState(false);
  const [todayFeedbackCount, setTodayFeedbackCount] = useState(0);
  const [isFeedbackStatsExpanded, setIsFeedbackStatsExpanded] = useState(false);

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
      logger.error('제출 실패:', err);
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
        logger.error('📭 작성한 글 조회 실패:', err);
        setNoSubmissions(true);
      }

      try {
        const statRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/stats/${user.uid}`);
        setStats(statRes.data);
      } catch (err) {
        logger.error('📉 통계 조회 실패:', err);
      }

      try {
        const fbRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/received/${user.uid}`
        );
        setReceivedFeedbackData(fbRes.data);
      } catch (err) {
        logger.error(' 💬피드백 조회 실패:', err);
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/stats/${user.uid}`
        );
        setFeedbackStats(res.data);
      } catch (err) {
        logger.error('📊 피드백 통계 조회 실패:', err);
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
        setDailyFeedbackCount(res.data.count);
        console.log('오늘의 피드백 카운트:', res.data.count); // 디버깅용 로그 추가
      } catch (err) {
        logger.error('오늘의 피드백 개수 불러오기 실패:', err);
      }
    };

    fetchTodayFeedbackCount();
  }, [user]);

  useEffect(() => {
    const fetchWeeklyGrowth = async () => {
      if (!user) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/stats/weekly-growth/${user.uid}`
        );
        setWeeklyGrowth(res.data);
      } catch (err) {
        logger.error('📊 주간 성장 통계 조회 실패:', err);
      }
    };

    fetchWeeklyGrowth();
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
      } else if (sortBy === 'score') {
        return sortOrder === 'desc'
          ? (b.score || 0) - (a.score || 0)
          : (a.score || 0) - (b.score || 0);
      } else {
        const feedbackCountA = getFeedbacksForSubmission(a._id).length;
        const feedbackCountB = getFeedbacksForSubmission(b._id).length;
        return sortOrder === 'desc'
          ? feedbackCountB - feedbackCountA
          : feedbackCountA - feedbackCountB;
      }
    });

  // 평균 계산 로직을 useMemo로 분리
  const averageFeedback = useMemo(() => {
    if (!feedbackStats.totalSubmissions) return '0.0';
    return (feedbackStats.feedbackReceived / feedbackStats.totalSubmissions).toFixed(1);
  }, [feedbackStats.feedbackReceived, feedbackStats.totalSubmissions]);

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
        <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">📝 내가 쓴 글</h1>

        <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-base text-center font-medium">
          ✍ 글을 쓰고 다른 사용자에게 피드백을 3개 작성하면, 내가 쓴 글의 피드백을 볼 수 있어요!
        </div>

        <TokenDisplay />
        <WeeklyProgress className="mb-6" />

        {/* 통계 섹션 - 접었다 폈다 가능한 버전 유지 */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>📊</span> 작성한 글 통계
              </h2>
              <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                {isStatsExpanded ? '▼' : '▶'}
              </button>
            </div>

            {/* 접혀있을 때 보여줄 간단한 요약 */}
            {!isStatsExpanded && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">300자 평균</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(stats.mode_300?.averageScore || 0).toFixed(1)}
                    <span className="text-sm ml-1">점</span>
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">1000자 평균</p>
                  <p className="text-xl font-bold text-purple-600">
                    {(stats.mode_1000?.averageScore || 0).toFixed(1)}
                    <span className="text-sm ml-1">점</span>
                  </p>
                </div>
              </div>
            )}

            {/* 펼쳐져 있을 때 보여줄 상세 내용 */}
            {isStatsExpanded && (
              <div className="mt-6">
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
            )}
          </div>
        )}

        {/* 피드백 활동 통계 - 개선된 버전 */}
        {feedbackStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            {/* 헤더 섹션 */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsFeedbackStatsExpanded(!isFeedbackStatsExpanded)}
            >
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-xl">💫</span>
                피드백 활동
              </h2>
              <div className="flex items-center gap-2">
                {isFeedbackStatsExpanded && (
                  <select
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    onChange={e =>
                      setTimeFilter(e.target.value as 'all' | 'week' | 'month' | '3months')
                    }
                    defaultValue="all"
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="all">전체 기간</option>
                    <option value="week">이번 주</option>
                    <option value="month">이번 달</option>
                    <option value="3months">최근 3개월</option>
                  </select>
                )}
                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  {isFeedbackStatsExpanded ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {/* 접혀있을 때의 요약 뷰 */}
            {!isFeedbackStatsExpanded && (
              <div className="mt-4">
                {/* 진행 상태 표시 바 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">오늘의 피드백 진행률</span>
                    <span className="text-sm font-medium text-blue-600">
                      {dailyFeedbackCount}/3
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${Math.min((dailyFeedbackCount / 3) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 핵심 지표 요약 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">작성한 피드백</p>
                        <p className="text-xl font-bold text-blue-600">
                          {feedbackStats.feedbackGiven}
                        </p>
                      </div>
                      <span className="text-2xl">✍️</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">받은 피드백</p>
                        <p className="text-xl font-bold text-purple-600">
                          {feedbackStats.feedbackReceived}
                        </p>
                      </div>
                      <span className="text-2xl">💬</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 펼쳐졌을 때의 상세 뷰 */}
            {isFeedbackStatsExpanded && (
              <div className="mt-6 space-y-6">
                {/* 데스크탑 뷰 - 피드백 통계 카드 */}
                <div className="hidden sm:grid grid-cols-2 gap-4">
                  {/* 글 작성 현황 그룹 */}
                  <div className="bg-gradient-to-br from-blue-50 via-blue-100/30 to-white rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">글 작성 현황</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/80 backdrop-blur rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📝</span>
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              {feedbackStats.totalSubmissions}
                            </p>
                            <p className="text-xs text-gray-600">작성한 글</p>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          {weeklyGrowth.submissions >= 0 ? '+' : ''}
                          {weeklyGrowth.submissions} 이번 주
                        </p>
                      </div>
                      <div className="bg-white/80 backdrop-blur rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔓</span>
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {feedbackStats.unlockedSubmissions}
                            </p>
                            <p className="text-xs text-gray-600">언락된 글</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${(feedbackStats.unlockedSubmissions / feedbackStats.totalSubmissions) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 피드백 교류 현황 그룹 */}
                  <div className="bg-gradient-to-br from-purple-50 via-purple-100/30 to-white rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">피드백 교류 현황</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/80 backdrop-blur rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✍️</span>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">
                              {feedbackStats.feedbackGiven}
                            </p>
                            <p className="text-xs text-gray-600">작성한 피드백</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(dailyFeedbackCount / 3) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-purple-600">{dailyFeedbackCount}/3</span>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💬</span>
                          <div>
                            <p className="text-2xl font-bold text-red-600">
                              {feedbackStats.feedbackReceived}
                            </p>
                            <p className="text-xs text-gray-600">받은 피드백</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">평균 {averageFeedback}개/글</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 전체 활동 요약 */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">전체 활동 요약</h3>
                    <span className="text-sm text-orange-600 font-medium">
                      달성률 {feedbackStats.unlockRate}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-gray-200/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                        style={{ width: `${feedbackStats.unlockRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>글당 평균 {averageFeedback}개 피드백</span>
                      <span>일일 피드백 {dailyFeedbackCount}/3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
        <FilterSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          showSortOptions={true}
          customSortOptions={[
            { value: 'date', label: '날짜순' },
            { value: 'score', label: '점수순' },
            { value: 'feedback', label: '피드백순' },
          ]}
        />

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
                      {item.aiFeedback && (
                        <div className="p-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span aria-label="AI">{ICONS.AI}</span>
                            <h4 className="text-sm font-medium text-gray-900">AI 피드백</h4>
                          </div>
                          <div className="mt-6">
                            <AIFeedback feedback={item.aiFeedback} />
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
        <ScrollToTop />
      </div>
    </ErrorBoundary>
  );
};

export default MySubmissions;
