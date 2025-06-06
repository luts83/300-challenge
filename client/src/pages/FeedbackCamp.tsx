// src/pages/FeedbackCamp.tsx
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { FilterSection } from '../../archive/FilterSection';
import { FeedbackForm } from '../components/FeedbackCamp/FeedbackForm';
import {
  FeedbackList,
  FeedbackGuidance,
  FeedbackStats,
  MyFeedbacks,
  Submission,
  Feedback,
  TodaySummary,
} from '../components/FeedbackCamp';
import useFilteredSubmissions from '../hooks/useFilteredSubmissions';
import { logger } from '../utils/logger';
import ScrollToTop from '../components/ScrollToTop';
import { FeedbackFilterSection } from '../components/FeedbackCamp/FeedbackFilterSection';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useLocation } from 'react-router-dom'; // 추가
import FeedbackNotice from '../components/FeedbackNotice';

const FeedbackCamp = () => {
  const { user } = useUser();
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [feedbacks, setFeedbacks] = useState<{ [id: string]: string }>({});
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMySubmission, setHasMySubmission] = useState(false);
  const [givenFeedbacks, setGivenFeedbacks] = useState<Feedback[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [visibleMyFeedbacks, setVisibleMyFeedbacks] = useState(3);
  const [activeTab, setActiveTab] = useState<'all' | 'mode_300' | 'mode_1000'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'feedback' | 'recent' | 'likes'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'all' | 'written' | 'available'>('all');
  const [inputValue, setInputValue] = useState(searchQuery);
  const [highlightedSubmissions, setHighlightedSubmissions] = useState<Submission[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;
  const [totalSubmissionsCount, setTotalSubmissionsCount] = useState(0);
  const [mode300TotalCount, setMode300TotalCount] = useState(0);
  const [mode1000TotalCount, setMode1000TotalCount] = useState(0);
  const [feedbackAvailableCount, setFeedbackAvailableCount] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastSubmissionElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prev => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetchMySubmissionStatus(); // 오늘 글 작성 여부 확인
      fetchAllSubmissions(); // 전체 피드백 대상 글 불러오기
      fetchGivenFeedbacks(); // 내가 쓴 피드백 불러오기
    }
  }, [user, location.key]); // ✅ 페이지에 다시 들어올 때마다 실행되도록

  useEffect(() => {
    const fetchPopularSubmissions = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/popular?limit=3`);
        setHighlightedSubmissions(res.data);
      } catch (err) {
        logger.error('인기 글 불러오기 실패:', err);
      }
    };

    fetchPopularSubmissions();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    mode_300: 0,
    mode_1000: 0,
  });

  const [todaySubmissionModes, setTodaySubmissionModes] = useState<Set<'mode_300' | 'mode_1000'>>(
    new Set()
  );

  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(0);

  const [counts, setCounts] = useState({
    all: 0,
    mode_300: 0,
    mode_1000: 0,
    written: 0,
    available: 0,
    available_300: 0,
    available_1000: 0,
  });

  const getAvailableFeedbackModes = (userModes: Set<'mode_300' | 'mode_1000'>) => {
    if (!CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
      return userModes;
    }

    const availableModes = new Set<'mode_300' | 'mode_1000'>();
    userModes.forEach(mode => {
      CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[mode].forEach(allowedMode => {
        availableModes.add(allowedMode as 'mode_300' | 'mode_1000');
      });
    });
    return availableModes;
  };

  const filteredData = useMemo(() => {
    let filtered = {
      submissions: [...allSubmissions],
      givenFeedbacks: [...givenFeedbacks],
    };

    if (activeTab !== 'all') {
      filtered.submissions = filtered.submissions.filter(sub => sub.mode === activeTab);
      filtered.givenFeedbacks = filtered.givenFeedbacks.filter(fb => fb.mode === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered.submissions = filtered.submissions.filter(
        sub =>
          sub.title?.toLowerCase()?.includes(query) ||
          false ||
          sub.text?.toLowerCase()?.includes(query) ||
          false
      );
      filtered.givenFeedbacks = filtered.givenFeedbacks.filter(
        fb =>
          fb.submissionTitle?.toLowerCase()?.includes(query) ||
          false ||
          fb.content?.toLowerCase()?.includes(query) ||
          false
      );
    }

    // ✅ 이미 피드백을 남긴 글은 FeedbackList 대상에서 제외
    filtered.submissions = filtered.submissions.filter(sub => !submittedIds.includes(sub._id));

    const sortFn = (a: any, b: any) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'feedback') {
        return sortOrder === 'desc'
          ? (b.feedbackCount || 0) - (a.feedbackCount || 0)
          : (a.feedbackCount || 0) - (b.feedbackCount || 0);
      }
      if (sortBy === 'recent') {
        return sortOrder === 'desc'
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'likes') {
        return sortOrder === 'desc'
          ? (b.likeCount || 0) - (a.likeCount || 0)
          : (a.likeCount || 0) - (b.likeCount || 0);
      }
      return 0;
    };

    filtered.submissions.sort(sortFn);
    filtered.givenFeedbacks.sort(sortFn);

    return filtered;
  }, [
    allSubmissions,
    givenFeedbacks,
    activeTab,
    searchQuery,
    sortBy,
    sortOrder,
    submittedIds,
    totalSubmissionsCount,
  ]);

  const fetchGivenFeedbacks = async () => {
    if (!user) return;
    try {
      const modeParam = activeTab === 'all' ? '' : `&mode=${encodeURIComponent(activeTab)}`;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}?page=${page}&limit=1000${modeParam}`
      );
      setGivenFeedbacks(res.data.feedbacks);
      setTotalFeedbacks(res.data.total);
      setTodaySummary(res.data.todaySummary);
    } catch (err) {
      logger.error('내가 작성한 피드백 조회 실패:', err);
    }
  };

  const fetchAllSubmissions = async (pageNum = 1, reset = false) => {
    if (!user) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/all-submissions/${user.uid}`,
        {
          params: {
            page: pageNum,
            limit: ITEMS_PER_PAGE,
            search: searchQuery || undefined,
            mode: activeTab === 'all' ? undefined : activeTab,
          },
        }
      );

      // ✅ 여기! count 관련 필드 분리
      const {
        submissions: newSubmissions = [],
        hasMore: more = false,
        totalCount,
        mode300Count,
        mode1000Count,
        feedbackGivenCount,
        feedbackAvailableCount,
        feedbackAvailableCount_300,
        feedbackAvailableCount_1000,
      } = res.data;

      setCounts({
        all: totalCount,
        mode_300: mode300Count,
        mode_1000: mode1000Count,
        written: feedbackGivenCount,
        available: feedbackAvailableCount,
        available_300: feedbackAvailableCount_300,
        available_1000: feedbackAvailableCount_1000,
      });

      const alreadySubmitted = newSubmissions
        .filter((sub: any) => sub.hasGivenFeedback)
        .map((sub: any) => sub._id);

      if (reset) {
        setAllSubmissions(newSubmissions);
        setSubmittedIds(alreadySubmitted);
      } else {
        setAllSubmissions(prev => {
          const combined = [...prev, ...newSubmissions];
          const uniqueMap = new Map();
          for (const item of combined) {
            uniqueMap.set(item._id, item); // 같은 _id면 덮어씌움
          }
          return Array.from(uniqueMap.values());
        });

        setSubmittedIds(prev => Array.from(new Set([...prev, ...alreadySubmitted])));
      }

      setHasMore(more);
      setTotalSubmissionsCount(totalCount);
      setMode300TotalCount(mode300Count);
      setMode1000TotalCount(mode1000Count);
      setFeedbackAvailableCount(feedbackAvailableCount);
    } catch (err) {
      logger.error('❌ 전체 글 목록 불러오기 실패:', err);
      setError('글 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    if (page > 1) {
      console.log('페이지 증가:', page);
      fetchAllSubmissions(page);
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
    setAllSubmissions([]);
    setSubmittedIds([]);
    fetchAllSubmissions(1, true); // reset = true
  }, [searchQuery, activeTab]);

  const fetchMySubmissionStatus = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`);
      const submissions = Array.isArray(res.data) ? res.data : res.data.submissions || [];

      const today = new Date().toISOString().slice(0, 10);
      const todaySubmissions = submissions.filter((sub: any) => sub.submissionDate === today);

      setHasMySubmission(todaySubmissions.length > 0); // ✅ 오늘 글 여부만 반영
      const modes = new Set(todaySubmissions.map((sub: any) => sub.mode));
      setTodaySubmissionModes(modes);
    } catch (err) {
      logger.error('내 글 존재 여부 확인 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (submissionId: string) => {
    if (!user) return;

    try {
      setLoading(true);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        toSubmissionId: submissionId,
        fromUid: user.uid,
        content: feedbacks[submissionId],
      });

      const todayCount = response.data.todayFeedbackCount;

      // 1000자 글에 피드백을 달아 열람 권한이 언락된 경우
      const isThousandWordFeedbackUnlocked = response.data.isThousandWordFeedbackUnlocked;
      if (isThousandWordFeedbackUnlocked) {
        alert(
          `🎉 축하합니다! 1000자 글에 피드백을 달아 피드백 열람 권한이 언락되었습니다!\n\n이제 오늘 작성한 내 글의 피드백을 확인하실 수 있습니다.`
        );
      }
      // 피드백 3개 달성 시
      else if (todayCount === CONFIG.FEEDBACK.REQUIRED_COUNT) {
        alert(
          `🎉 축하합니다! 오늘의 피드백 미션을 완료하셨습니다!\n\n이제 오늘 작성한 내 글의 피드백을 확인하실 수 있습니다.`
        );
      }
      // 3개 미만일 때
      else if (todayCount < CONFIG.FEEDBACK.REQUIRED_COUNT) {
        alert(
          `✅ 피드백이 제출되었습니다.\n\n오늘 작성한 피드백: ${todayCount}/${CONFIG.FEEDBACK.REQUIRED_COUNT}`
        );
      }
      // 3개 초과일 때
      else {
        alert('✅ 피드백이 제출되었습니다.');
      }

      // 상태 업데이트
      setSubmittedIds(prev => [...prev, submissionId]);

      // 피드백 입력 초기화
      setFeedbacks(prev => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[submissionId];
        return newFeedbacks;
      });

      // 확장된 글 접기
      setExpanded(null);

      // 페이지 상태 업데이트
      Promise.all([fetchAllSubmissions(), fetchGivenFeedbacks(), fetchMySubmissionStatus()]);

      // 일일 피드백 카운트 업데이트
      setDailyFeedbackCount(todayCount);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message;

        // 서버에서 온 에러 메시지에 따라 더 친절한 안내
        if (errorMessage?.includes('오늘은 아직 글을 작성하지 않으셨네요')) {
          const result = window.confirm(
            '❌ 피드백을 남기기 위해서는 오늘 글을 작성해야 합니다!\n\n' +
              '1. 먼저 오늘의 글쓰기를 완료해 주세요.\n' +
              '2. 글쓰기 완료 후 다시 피드백을 남겨주세요.\n\n' +
              '✍️ 글쓰기 페이지로 이동하시겠습니까?'
          );

          if (result) {
            navigate('/'); // 글쓰기 페이지로 이동
          }
        } else if (errorMessage?.includes('이미 이 글에 피드백을 작성하셨습니다')) {
          alert('❌ 이미 이 글에 피드백을 작성하셨습니다.\n다른 글에 피드백을 남겨보세요!');
        } else if (errorMessage?.includes('피드백을 작성할 수 없습니다')) {
          alert(
            '❌ 피드백을 작성할 수 없습니다.\n\n' +
              '가능한 원인:\n' +
              '1. 오늘 글을 작성하지 않은 경우\n' +
              '2. 자신의 글에 피드백을 시도한 경우\n' +
              '3. 이미 피드백을 작성한 글인 경우\n\n' +
              '문제가 지속되면 관리자에게 문의해 주세요.'
          );
        } else {
          // 기타 에러
          alert(
            '❌ 피드백 제출에 실패했습니다.\n\n' +
              '문제가 지속되면 아래 내용과 함께 관리자에게 문의해 주세요.\n' +
              `에러 메시지: ${errorMessage || '알 수 없는 오류'}`
          );
        }
      }
      logger.error('피드백 제출 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTodayFeedbackCount = async () => {
      if (!user) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`
        );
        setDailyFeedbackCount(res.data.count);
      } catch (err) {
        logger.error('오늘의 피드백 개수 불러오기 실패:', err);
      }
    };

    fetchTodayFeedbackCount();
  }, [user]);

  if (!user)
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <p className="mb-4 p-2 sm:p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm sm:text-base text-center font-medium leading-relaxed sm:leading-normal dark:bg-blue-900/80 dark:text-gray-300">
            ✍{' '}
            <span className="block sm:inline">
              회원가입 후 오늘의 글을 작성하고, 다른 사람의 글에 피드백을 남겨보세요!
            </span>
            <br className="hidden sm:block" />
            <span className="block sm:inline">
              매일 한 편씩 글을 쓰고, 피드백을 통해 성장할 수 있습니다.
            </span>
            <br className="hidden sm:block" />
            <button
              onClick={() => navigate('/login')}
              className="mt-3 inline-block w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs sm:text-sm rounded-lg transition"
            >
              로그인하러 가기
            </button>
          </p>

          {/* 👇 하이라이트 글 미리보기 */}
          <div className="mt-8">
            <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">
              📝 최근 인기 글 미리보기
            </h3>
            <div className="space-y-3">
              {highlightedSubmissions.slice(0, 3).map(submission => (
                <div
                  key={submission._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900/80 shadow-sm"
                >
                  {/* 제목 + 주제 */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">{submission.title}</h4>

                    {/* 주제 태그 - 데스크탑 */}
                    {submission.topic && (
                      <span className="hidden sm:inline-block text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-2">
                        📌 {submission.topic}
                      </span>
                    )}
                  </div>

                  {/* 주제 태그 - 모바일 */}
                  {submission.topic && (
                    <span className="sm:hidden inline-block text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md mb-1 w-fit">
                      📌 {submission.topic}
                    </span>
                  )}

                  {/* 본문 요약 */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {submission.text}
                  </p>

                  {/* 메타 정보 */}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💬 피드백 {submission.feedbackCount || 0}개 · ❤️ 좋아요{' '}
                    {submission.likeCount || 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  if (loading)
    return (
      <Layout>
        <p className="msg-auth pt-20">로딩 중...</p>
      </Layout>
    );
  if (error)
    return (
      <Layout>
        <p className="msg-error pt-20">에러: {error}</p>
      </Layout>
    );
  // if (!hasMySubmission) {
  //   return (
  //     <Layout>
  //       <p className="msg-submit-note pt-16 text-gray-800 dark:text-gray-300">
  //         ✍ 먼저 글을 작성해야 피드백 미션을 진행할 수 있어요!
  //       </p>
  //     </Layout>
  //   );
  // }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center dark:text-gray-300">
          🤝 피드백 미션
        </h1>

        <FeedbackNotice />

        <FeedbackStats dailyFeedbackCount={dailyFeedbackCount} todaySummary={todaySummary} />

        <FeedbackGuidance
          dailyFeedbackCount={dailyFeedbackCount}
          availableModes={getAvailableFeedbackModes(todaySubmissionModes)}
          isExpanded={isGuideExpanded}
          onToggleExpand={() => setIsGuideExpanded(!isGuideExpanded)}
        />

        <FeedbackFilterSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={inputValue}
          setSearchQuery={setInputValue}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          counts={counts}
        />

        {(viewMode === 'all' || viewMode === 'written') && (
          <MyFeedbacks
            submissions={filteredData.submissions}
            feedbacks={filteredData.givenFeedbacks}
            visibleCount={visibleMyFeedbacks}
            onLoadMore={() => setVisibleMyFeedbacks(prev => prev + 3)}
            totalCount={filteredData.givenFeedbacks.length}
          />
        )}

        {(viewMode === 'all' || viewMode === 'available') &&
          (!hasMySubmission ? (
            <>
              <p className="mb-4 p-2 sm:p-3 bg-blue-100/80 text-blue-800 rounded-lg text-sm sm:text-base text-center font-medium leading-relaxed sm:leading-normal dark:bg-blue-900/80 dark:text-gray-300">
                ✍{' '}
                <span className="block sm:inline">
                  오늘의 글을 작성해야 피드백 미션을 진행할 수 있어요!
                </span>
                <br className="hidden sm:block" />
                <span className="block sm:inline">
                  매일 한 편씩 글을 쓰고, 다른 사람의 글에 피드백을 남겨보세요.
                </span>
                <br className="hidden sm:block" />
                <button
                  onClick={() => navigate('/')}
                  className="mt-3 inline-block w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs sm:text-sm rounded-lg transition"
                >
                  글쓰기 하러 가기
                </button>
              </p>

              {/* 👇 하이라이트 글 미리보기 */}
              <div className="mt-8">
                <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  📝 최근 인기 글 미리보기
                </h3>
                <div className="space-y-3">
                  {highlightedSubmissions.slice(0, 3).map(submission => (
                    <div
                      key={submission._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-900/80 shadow-sm"
                    >
                      {/* 제목 + 주제 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {submission.title}
                        </h4>

                        {/* 주제 태그 - 데스크탑 */}
                        {submission.topic && (
                          <span className="hidden sm:inline-block text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-2">
                            📌 {submission.topic}
                          </span>
                        )}
                      </div>

                      {/* 주제 태그 - 모바일 */}
                      {submission.topic && (
                        <span className="sm:hidden inline-block text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md mb-1 w-fit">
                          📌 {submission.topic}
                        </span>
                      )}

                      {/* 본문 요약 */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {submission.text}
                      </p>

                      {/* 메타 정보 */}
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        💬 피드백 {submission.feedbackCount || 0}개 · ❤️ 좋아요{' '}
                        {submission.likeCount || 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : filteredData.submissions.length === 0 ? (
            <p className="text-center py-8 text-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white/80 rounded-lg shadow-sm">
              🔍 검색 결과가 없습니다.
            </p>
          ) : (
            <FeedbackList
              submissions={filteredData.submissions}
              feedbacks={feedbacks}
              expanded={expanded}
              submittedIds={submittedIds}
              onFeedbackChange={(id, value) => setFeedbacks(prev => ({ ...prev, [id]: value }))}
              onSubmitFeedback={handleSubmitFeedback}
              onToggleExpand={id => setExpanded(expanded === id ? null : id)}
              lastSubmissionElementRef={lastSubmissionElementRef}
              totalAvailable={
                activeTab === 'all'
                  ? counts.available
                  : activeTab === 'mode_300'
                    ? counts.available_300
                    : counts.available_1000
              }
            />
          ))}

        {/* {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              더 보기
            </button>
          </div>
        )} */}

        <ScrollToTop />
      </div>
    </Layout>
  );
};

export default FeedbackCamp;
