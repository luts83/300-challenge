// src/pages/MySubmissions.tsx
import React, {
  useEffect,
  useState,
  Component,
  ErrorInfo,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
// import FeedbackMissionPanel from '../components/FeedbackMissionPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';

import ScrollToTop from '../components/ScrollToTop';
import { WeeklyProgress } from '../components/SubmissionStats/WeeklyProgress';
import TokenDisplay from '../components/TokenDisplay';
import { FeedbackStats } from '../components/SubmissionStats/FeedbackStats';
import { SubmissionItem } from '../components/SubmissionList/SubmissionItem';
import { UnlockModal } from '../components/SubmissionList/UnlockModal';
import { useTokens } from '../hooks/useTokens';
import { SubmissionStats } from '../components/SubmissionStats/SubmissionStats';
import type { StatsData } from '../components/SubmissionStats/types';
import { SubmissionFilterSection } from '../components/FilterSection/SubmissionFilterSection';
import { useSubmissionFilter } from '../hooks/useSubmissionFilter';
import Layout from '../components/Layout';
import FeedbackNotice from '../components/FeedbackNotice';

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
  feedbacks?: FeedbackItem[];
  likeCount?: number;
  likedUsers?: string[];
};

type FeedbackItem = {
  toSubmissionId: string | null;
  content: string;
  createdAt: string;
};

// FeedbackStats 타입 정의
type FeedbackStats = {
  totalSubmissions: number;
  unlockedSubmissions: number;
  feedbackGiven: number;
  feedbackReceived: number;
  unlockRate: number;
  receivedFeedbackDetails: any[];
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

// 피드백 필터 타입 정의
type FeedbackFilterType = 'has_feedback' | 'open_feedback' | 'locked_feedback' | null;

const MySubmissions = () => {
  const { user, loading: authLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData>({
    mode_300: {
      count: 0,
      averageScore: 0,
      maxScore: 0,
      recentDate: '',
      averageDuration: 0,
    },
    mode_1000: {
      count: 0,
      averageScore: 0,
      maxScore: 0,
      recentDate: '',
      averageDuration: 0,
      averageSessionCount: 0,
    },
  });
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
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  const [sortBy, setSortBy] = useState<'date' | 'score' | 'feedback'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [feedbackStats, setFeedbackStats] = useState({
    totalSubmissions: 0,
    unlockedSubmissions: 0,
    feedbackGiven: 0,
    feedbackReceived: 0,
    unlockRate: 0,
    receivedFeedbackDetails: [],
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
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { tokens, refetchTokens } = useTokens();

  // 페이지네이션 관련 상태 추가
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Intersection Observer 참조 생성
  const observer = useRef<IntersectionObserver>();
  const lastSubmissionElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prevPage => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore]
  );

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

  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilterType>(null);

  const [counts, setCounts] = useState({
    all: 0,
    mode_300: 0,
    mode_1000: 0,
    has_feedback: 0,
    open_feedback: 0,
    locked_feedback: 0,
  });

  const fetchSummaryCounts = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/summary/${user.uid}`);
      setCounts(res.data);
    } catch (err) {
      logger.error('📊 summary count fetch 실패:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummaryCounts();
    }
  }, [user]);

  // 필터링된 submissions를 커스텀 훅으로 관리
  const filteredSubmissions = useSubmissionFilter(
    submissions,
    activeTab,
    searchQuery,
    sortBy,
    sortOrder,
    feedbackFilter
  );

  const fetchData = async (pageNum = 1) => {
    if (!user) return;

    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const [submissionsRes, feedbackRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`, {
          params: {
            page: pageNum,
            limit: ITEMS_PER_PAGE,
            search: searchQuery || undefined, // 🔍 검색어 추가
            feedbackFilter: feedbackFilter || undefined,
          },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/stats/${user.uid}`),
      ]);

      // console.log('🔍 요청 params', {
      //   page: pageNum,
      //   limit: ITEMS_PER_PAGE,
      //   search: searchQuery || undefined,
      //   feedbackFilter: feedbackFilter || undefined,
      // });

      const { submissions: newSubmissions, hasMore: more } = submissionsRes.data;
      const feedbackData = feedbackRes.data.receivedFeedbackDetails || [];

      const submissionsWithFeedback = newSubmissions.map((submission: Submission) => {
        const matchedFeedbacks = feedbackData.filter((feedback: any) => {
          const feedbackId = feedback.toSubmissionId || feedback.submissionId;
          return feedbackId?.toString() === submission._id.toString();
        });

        return {
          ...submission,
          feedbacks: matchedFeedbacks.map((feedback: any) => ({
            content: feedback.content || feedback.feedbackContent,
            createdAt: feedback.createdAt || feedback.feedbackDate,
            writer: {
              displayName: feedback.fromUser?.displayName || '익명',
            },
          })),
        };
      });

      if (pageNum === 1) {
        setSubmissions(submissionsWithFeedback);
      } else {
        setSubmissions(prev => [...prev, ...submissionsWithFeedback]);
      }

      setHasMore(more);
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      logger.error('❌ fetchData 실패:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 통계 데이터를 가져오는 함수
  const fetchAllStats = async () => {
    if (!user) return;

    try {
      const [statsRes, feedbackStatsRes, weeklyRes, dailyRes] = await Promise.all([
        // 작성 통계
        axios.get(`${import.meta.env.VITE_API_URL}/api/stats/${user.uid}`),
        // 피드백 통계
        axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/stats/${user.uid}`),
        // 주간 성장
        axios.get(`${import.meta.env.VITE_API_URL}/api/stats/weekly-growth/${user.uid}`),
        // 오늘의 피드백 수
        axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`),
      ]);

      // 각 상태 업데이트
      setStats(statsRes.data);
      setFeedbackStats(feedbackStatsRes.data);
      setWeeklyGrowth(weeklyRes.data);
      setDailyFeedbackCount(dailyRes.data.count);
    } catch (err) {
      logger.error('통계 데이터 조회 실패:', err);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (user) {
      fetchData();
      fetchAllStats();
    }
  }, [user]);

  // 필터나 정렬 변경시 데이터 리셋
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setSubmissions([]);
    fetchData(1);
  }, [activeTab, searchQuery, sortBy, sortOrder]);

  // 페이지 변경시 추가 데이터 로드
  useEffect(() => {
    if (page > 1) fetchData(page);
  }, [page]);

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

  // 피드백 언락 핸들러
  const handleUnlockFeedback = (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsUnlockModalOpen(true);
  };

  // 실제 언락 처리 함수
  const handleUnlock = async (unlockType: 'single' | 'period') => {
    if (!user || !selectedSubmission) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/feedback/unlock-feedback`,
        {
          uid: user.uid,
          unlockType,
          submissionId: selectedSubmission._id,
        }
      );

      // 성공 시 데이터 리프레시
      await Promise.all([
        fetchData(), // 제출물 데이터 새로고침
        refetchTokens(), // 토큰 정보 새로고침
      ]);

      // 성공 메시지 표시
      alert(response.data.message);
    } catch (error: any) {
      logger.error('피드백 언락 실패:', error);
      alert(error.response?.data?.message || '피드백 언락에 실패했습니다.');
    }
  };

  if (!user) {
    return (
      <Layout>
        <p className="msg-auth relative pt-20">로그인이 필요합니다.</p>
      </Layout>
    );
  }

  if (authLoading) {
    return (
      <Layout>
        <p className="msg-auth relative pt-20">로딩 중...</p>
      </Layout>
    );
  }

  if (noSubmissions) {
    return (
      <p className="msg-submit-note relative pt-20">
        ✍ 아직 글을 작성하지 않으셨어요.
        <br />
        매일 한 편씩 도전해 보세요!
      </p>
    );
  }
  if (error)
    return (
      <Layout>
        <p className="msg-error relative pt-20">{error}</p>
      </Layout>
    );

  return (
    <Layout>
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">📝 내가 쓴 글</h1>

          <FeedbackNotice />

          <TokenDisplay />
          <WeeklyProgress />

          {/* 작성 통계 섹션 */}
          <SubmissionStats stats={stats} />

          {/* 피드백 통계 섹션 */}
          <FeedbackStats
            feedbackStats={feedbackStats}
            dailyFeedbackCount={dailyFeedbackCount}
            weeklyGrowth={weeklyGrowth}
          />

          {/* 피드백 미션 현황 */}
          {/* <FeedbackMissionPanel /> */}

          {/* 필터 및 정렬 섹션 */}
          <SubmissionFilterSection
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            feedbackFilter={feedbackFilter}
            setFeedbackFilter={setFeedbackFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            searchQuery={inputValue}
            setSearchQuery={setInputValue}
            counts={counts}
          />

          {/* 글 목록 */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">로딩 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <p className="text-center py-8 text-gray-700 bg-white/80 rounded-lg shadow-sm">
              🔍 검색 결과가 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission, index) => (
                <div
                  key={submission._id}
                  ref={index === filteredSubmissions.length - 1 ? lastSubmissionElementRef : null}
                >
                  <SubmissionItem
                    submission={submission}
                    isExpanded={expandedId === submission._id}
                    onToggleExpand={() => toggleExpand(submission._id)}
                    onUnlockFeedback={() => handleUnlockFeedback(submission)}
                    feedbacks={submission.feedbacks || []}
                  />
                </div>
              ))}
              {isLoadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">로딩 중...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UnlockModal 추가 */}
          {selectedSubmission && (
            <UnlockModal
              isOpen={isUnlockModalOpen}
              onClose={() => {
                setIsUnlockModalOpen(false);
                setSelectedSubmission(null);
              }}
              onUnlock={handleUnlock}
              submissionTitle={selectedSubmission.title}
              goldenKeys={tokens?.goldenKeys || 0}
            />
          )}

          <ScrollToTop />
        </div>
      </ErrorBoundary>
    </Layout>
  );
};

export default MySubmissions;
