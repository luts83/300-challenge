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

// 피드백 필터 타입 수정
type FeedbackFilterType = 'all' | 'unlocked' | 'locked' | null; // null은 필터 미적용

const MySubmissions = () => {
  const { user, loading: authLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
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

  const fetchData = async (pageNum = 1) => {
    if (!user) return;

    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      // 페이지네이션된 데이터 요청
      const [subRes, feedbackRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`, {
          params: {
            page: pageNum,
            limit: ITEMS_PER_PAGE,
            mode: activeTab === 'all' ? undefined : activeTab,
            search: searchQuery,
            sortBy,
            sortOrder,
          },
        }),
        // 피드백 데이터 요청 추가
        axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/received/${user.uid}`),
      ]);

      // 서버 응답 구조 처리 수정
      const newSubmissions = Array.isArray(subRes.data) ? subRes.data : [];

      // 피드백 데이터 설정
      setReceivedFeedbackData(feedbackRes.data || { totalWritten: 0, groupedBySubmission: [] });

      if (pageNum === 1) {
        setSubmissions(newSubmissions);
      } else {
        setSubmissions(prev => [...prev, ...newSubmissions]);
      }

      setHasMore(newSubmissions.length === ITEMS_PER_PAGE);

      if (newSubmissions.length === 0) {
        setNoSubmissions(true);
      } else {
        setNoSubmissions(false);
      }

      // 첫 페이지 로드시에만 통계 데이터 가져오기
      if (pageNum === 1) {
        try {
          const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/stats/${user.uid}`);
          setStats(statsRes.data);
        } catch (err) {
          logger.error('통계 데이터 로딩 실패:', err);
        }

        try {
          const feedbackStatsRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/feedback/stats/${user.uid}`
          );
          setFeedbackStats(feedbackStatsRes.data);
        } catch (err) {
          logger.error('피드백 통계 로딩 실패:', err);
        }

        try {
          const feedbackRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`
          );
          setDailyFeedbackCount(feedbackRes.data.count);
        } catch (err) {
          logger.error('오늘의 피드백 카운트 로딩 실패:', err);
        }
      }
    } catch (err) {
      logger.error('데이터 로딩 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      if (pageNum === 1) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  };

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

  // 기본값을 null로 변경
  const [feedbackFilter, setFeedbackFilter] = useState<string | null>(null);

  // filterCounts 계산 로직 추가
  const filterCounts = useMemo(() => {
    // 모드별 카운트
    const modeCounts = {
      all: submissions.length,
      mode_300: submissions.filter(sub => sub.mode === 'mode_300').length,
      mode_1000: submissions.filter(sub => sub.mode === 'mode_1000').length,
    };

    // 피드백 상태별 카운트 - 현재 선택된 모드에 따라 필터링
    const filteredSubmissions =
      activeTab === 'all' ? submissions : submissions.filter(sub => sub.mode === activeTab);

    // 피드백 상태 카운트
    const feedbackCounts = {
      has_feedback: filteredSubmissions.filter(sub =>
        receivedFeedbackData.groupedBySubmission.some(fb => fb.toSubmissionId === sub._id)
      ).length,
      open_feedback: filteredSubmissions.filter(sub => sub.feedbackUnlocked).length,
      locked_feedback: filteredSubmissions.filter(sub => !sub.feedbackUnlocked).length,
    };

    return {
      ...modeCounts,
      ...feedbackCounts,
    };
  }, [submissions, activeTab, receivedFeedbackData.groupedBySubmission]);

  // 필터링된 제출물 계산
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    // 검색어 필터링 - 제목과 내용 모두 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        sub =>
          sub.title?.toLowerCase()?.includes(query) ||
          false ||
          sub.text?.toLowerCase()?.includes(query) ||
          false
      );
    }

    // 모드 필터 적용
    if (activeTab !== 'all') {
      filtered = filtered.filter(sub => sub.mode === activeTab);
    }

    // 피드백 상태 필터 적용
    if (feedbackFilter !== null) {
      switch (feedbackFilter) {
        case 'has_feedback':
          filtered = filtered.filter(sub =>
            receivedFeedbackData.groupedBySubmission.some(fb => fb.toSubmissionId === sub._id)
          );
          break;
        case 'open_feedback':
          filtered = filtered.filter(sub => sub.feedbackUnlocked);
          break;
        case 'locked_feedback':
          filtered = filtered.filter(sub => !sub.feedbackUnlocked);
          break;
      }
    }

    // 정렬 적용
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'feedback') {
        const aFeedbackCount = receivedFeedbackData.groupedBySubmission.filter(
          fb => fb.toSubmissionId === a._id
        ).length;
        const bFeedbackCount = receivedFeedbackData.groupedBySubmission.filter(
          fb => fb.toSubmissionId === b._id
        ).length;
        return sortOrder === 'desc'
          ? bFeedbackCount - aFeedbackCount
          : aFeedbackCount - bFeedbackCount;
      }
      return 0;
    });
  }, [
    submissions,
    activeTab,
    feedbackFilter,
    searchQuery,
    sortBy,
    sortOrder,
    receivedFeedbackData.groupedBySubmission,
  ]);

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
        <WeeklyProgress />

        {/* 통계 섹션 - 접었다 폈다 가능한 버전 유지 */}
        {stats && <SubmissionStats stats={stats} />}

        {/* 피드백 활동 통계 */}
        {feedbackStats && (
          <FeedbackStats
            feedbackStats={feedbackStats}
            dailyFeedbackCount={dailyFeedbackCount}
            weeklyGrowth={weeklyGrowth}
          />
        )}

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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          counts={filterCounts}
        />

        {/* 글 목록 */}
        {isLoading ? (
          <div className="text-center py-8">
            <p>로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        ) : noSubmissions ? (
          <div className="text-center py-8">
            <p>아직 작성한 글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission, index) => (
              <div
                key={submission._id}
                ref={
                  index === filteredSubmissions.length - 1 ? lastSubmissionElementRef : undefined
                }
              >
                <SubmissionItem
                  submission={submission}
                  isExpanded={expandedId === submission._id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === submission._id ? null : submission._id)
                  }
                  onUnlockFeedback={() => handleUnlockFeedback(submission)}
                  feedbacks={getFeedbacksForSubmission(submission._id)}
                />
              </div>
            ))}
            {isLoadingMore && (
              <div className="text-center py-4">
                <p>로딩 중...</p>
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
            bonusTokens={tokens?.bonusTokens || 0}
          />
        )}

        <ScrollToTop />
      </div>
    </ErrorBoundary>
  );
};

export default MySubmissions;
