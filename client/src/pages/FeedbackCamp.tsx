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
import DateRangeFilter from '../components/DateRangeFilter';
import { StructuredFeedbackForm } from '../components/FeedbackCamp/StructuredFeedbackForm';

interface StructuredFeedback {
  strengths: string;
  improvements: string;
  overall: string;
}

const FeedbackCamp = () => {
  const { user } = useUser();

  // ✅ 사용자 시간대 기준으로 오늘 날짜를 계산하는 유틸리티 함수
  const getUserTodayDate = () => {
    const today = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userOffset = new Date().getTimezoneOffset();
    const userTime = new Date(today.getTime() - userOffset * 60 * 1000);
    return userTime.toISOString().split('T')[0];
  };

  // 상태 관리 단순화
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
  const [weeklyGrowth, setWeeklyGrowth] = useState({
    submissions: 0,
    thisWeek: 0,
    lastWeek: 0,
  });
  const [todayFeedbackCount, setTodayFeedbackCount] = useState({
    mode_300: 0,
    mode_1000: 0,
    total: 0,
  });

  // localStorage에서 상태가 복원되었는지 추적
  const [isStateRestored, setIsStateRestored] = useState<boolean | null>(null);
  const [allSubmissionDates, setAllSubmissionDates] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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

  // 🚀 성능 최적화: 초기 데이터 로딩을 단순화
  const fetchInitialData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      if (!token) return;

      // 병렬로 모든 초기 데이터를 한 번에 가져오기
      const [submissionsRes, feedbacksRes, todayCountRes, weeklyGrowthRes, popularRes, datesRes] =
        await Promise.all([
          // 피드백 대상 글들
          axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/all-submissions/${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: ITEMS_PER_PAGE },
          }),
          // 내가 쓴 피드백들
          axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // 오늘 피드백 카운트
          axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              offset: new Date().getTimezoneOffset(),
            },
          }),
          // 주간 성장 데이터
          axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats/${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // 인기 글들
          axios.get(`${import.meta.env.VITE_API_URL}/api/submit/popular?limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // 날짜 목록
          axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/all-dates/${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      // 데이터 설정
      const submissionsData = submissionsRes.data;
      setAllSubmissions(submissionsData.submissions || []);
      setSubmittedIds(
        (submissionsData.submissions || [])
          .filter((sub: any) => sub.hasGivenFeedback)
          .map((sub: any) => sub._id)
      );
      setHasMore(submissionsData.hasMore || false);
      setTotalSubmissionsCount(submissionsData.totalCount || 0);
      setMode300TotalCount(submissionsData.mode300Count || 0);
      setMode1000TotalCount(submissionsData.mode1000Count || 0);
      setFeedbackAvailableCount(submissionsData.feedbackAvailableCount || 0);

      // 카운트 설정
      setCounts({
        all: submissionsData.totalCount || 0,
        mode_300: submissionsData.mode300Count || 0,
        mode_1000: submissionsData.mode1000Count || 0,
        written: submissionsData.feedbackGivenCount || 0,
        available: submissionsData.feedbackAvailableCount || 0,
        available_300: submissionsData.feedbackAvailableCount_300 || 0,
        available_1000: submissionsData.feedbackAvailableCount_1000 || 0,
      });

      // 피드백 데이터 설정
      const feedbacksData = feedbacksRes.data;
      setGivenFeedbacks(feedbacksData.feedbacks || []);

      // 오늘 피드백 카운트 설정
      const todayData = todayCountRes.data;
      setTodayFeedbackCount({
        mode_300: todayData.mode_300 || 0,
        mode_1000: todayData.mode_1000 || 0,
        total: todayData.total || 0,
      });

      // localStorage에 저장
      if (user?.uid) {
        try {
          localStorage.setItem(`todayFeedbackCount_${user.uid}`, JSON.stringify(todayData));
          localStorage.setItem(`todayFeedbackCount_date_${user.uid}`, getUserTodayDate());
        } catch (e) {
          console.warn('localStorage 저장 실패:', e);
        }
      }

      // 주간 성장 데이터 설정
      const weeklyData = weeklyGrowthRes.data;
      setWeeklyGrowth({
        submissions: weeklyData.submissionsToday || 0,
        thisWeek: weeklyData.thisWeek || 0,
        lastWeek: weeklyData.lastWeek || 0,
      });

      // 인기 글 설정
      const popularData = popularRes.data;
      const shuffled = popularData.sort(() => 0.5 - Math.random());
      setHighlightedSubmissions(shuffled.slice(0, 3));

      // 날짜 목록 설정
      const datesData = datesRes.data;
      setAllSubmissionDates(datesData.dates || []);

      // 내 글 작성 여부 확인 - 날짜 목록에서 오늘 날짜와 모드 정보 확인
      const today = getUserTodayDate();
      const todaySubmissionsCount = datesData.dates?.includes(today) ? 1 : 0;
      const newHasMySubmission = todaySubmissionsCount > 0;

      // 오늘 제출한 모드 확인 - API에서 반환된 todayModes 사용
      const modes = new Set<'mode_300' | 'mode_1000'>();
      if (datesData.todayModes) {
        datesData.todayModes.forEach((mode: string) => {
          if (mode === 'mode_300' || mode === 'mode_1000') {
            modes.add(mode);
          }
        });
      }

      setHasMySubmission(newHasMySubmission);
      setTodaySubmissionModes(modes);

      console.log('🌍 [피드백 미션] 오늘 글 작성 여부 확인:', {
        today,
        todaySubmissionsCount,
        hasMySubmission: newHasMySubmission,
        modes: Array.from(modes),
        todayModes: datesData.todayModes,
      });
    } catch (error) {
      console.error('❌ 초기 데이터 로딩 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // 🚀 단순화된 초기 로딩
  useEffect(() => {
    if (user && isStateRestored !== null) {
      fetchInitialData();
    }
  }, [user, isStateRestored, fetchInitialData]);

  // localStorage 상태 복원 (한 번만)
  useEffect(() => {
    if (user) {
      try {
        const key = `todayFeedbackCount_${user.uid}`;
        const dateKey = `todayFeedbackCount_date_${user.uid}`;
        const saved = localStorage.getItem(key);
        const savedDate = localStorage.getItem(dateKey);
        const today = getUserTodayDate();

        if (saved && savedDate === today) {
          const parsed = JSON.parse(saved);
          setTodayFeedbackCount(parsed);
          setIsStateRestored(true);
        } else {
          setIsStateRestored(false);
        }
      } catch (e) {
        console.error('❌ localStorage에서 피드백 카운트 복원 실패:', e);
        setIsStateRestored(false);
      }
    }
  }, [user]);

  // 검색어 디바운싱
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  // 🚀 추가 데이터 로딩 (무한 스크롤)
  const fetchMoreData = useCallback(
    async (pageNum: number) => {
      if (!user?.uid || pageNum <= 1) return;

      try {
        setIsLoadingMore(true);
        const token = await user.getIdToken();
        if (!token) return;

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/all-submissions/${user.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              page: pageNum,
              limit: ITEMS_PER_PAGE,
              search: searchQuery || undefined,
              mode: activeTab === 'all' ? undefined : activeTab,
            },
          }
        );

        const { submissions: newSubmissions = [], hasMore: more = false } = res.data;

        setAllSubmissions(prev => {
          const combined = [...prev, ...newSubmissions];
          const uniqueMap = new Map();
          for (const item of combined) {
            uniqueMap.set(item._id, item);
          }
          return Array.from(uniqueMap.values());
        });

        setHasMore(more);
      } catch (err) {
        logger.error('❌ 추가 데이터 로딩 실패:', err);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [user?.uid, searchQuery, activeTab]
  );

  // 페이지 변경시 추가 데이터 로드
  useEffect(() => {
    if (page > 1) {
      fetchMoreData(page);
    }
  }, [page, fetchMoreData]);

  // 검색어나 탭 변경시 데이터 리셋
  useEffect(() => {
    setPage(1);
    setAllSubmissions([]);
    setSubmittedIds([]);
    if (user) {
      fetchInitialData();
    }
  }, [searchQuery, activeTab, user]);

  // 🚀 필터링된 데이터 계산 (useMemo 최적화)
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
        sub => sub.title?.toLowerCase()?.includes(query) || sub.text?.toLowerCase()?.includes(query)
      );
      filtered.givenFeedbacks = filtered.givenFeedbacks.filter(
        fb =>
          fb.submissionTitle?.toLowerCase()?.includes(query) ||
          fb.content?.toLowerCase()?.includes(query)
      );
    }

    // 이미 피드백을 남긴 글은 제외
    filtered.submissions = filtered.submissions.filter(sub => !submittedIds.includes(sub._id));

    // 정렬
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
  }, [allSubmissions, givenFeedbacks, activeTab, searchQuery, sortBy, sortOrder, submittedIds]);

  // 🚀 카운트 상태 추가
  const [counts, setCounts] = useState({
    all: 0,
    mode_300: 0,
    mode_1000: 0,
    written: 0,
    available: 0,
    available_300: 0,
    available_1000: 0,
  });

  // 🚀 오늘 요약 상태 추가
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    mode_300: 0,
    mode_1000: 0,
  });

  // 🚀 오늘 제출 모드 상태 추가
  const [todaySubmissionModes, setTodaySubmissionModes] = useState<Set<'mode_300' | 'mode_1000'>>(
    new Set<'mode_300' | 'mode_1000'>()
  );

  // 🚀 가이드 확장 상태 추가
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  // 🚀 일일 피드백 카운트 상태 추가
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState({
    mode300: 0,
    mode1000: 0,
  });

  // 🚀 알림 설정 상태 추가
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // 🚀 알림 설정 토글 함수
  const toggleNotification = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const token = await user.getIdToken();
      if (!token) return;

      const newValue = !notificationEnabled;
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/notification`,
        {
          uid: user.uid,
          feedbackNotification: newValue,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNotificationEnabled(newValue);
    } catch (error) {
      console.error('알림 설정 변경 실패:', error);
    }
  }, [user?.uid, notificationEnabled]);

  // 🚀 피드백 제출 함수
  const handleFeedbackSubmit = useCallback(
    async (submissionId: string, feedback: string) => {
      if (!user?.uid) return;

      // 🛡️ 중복 제출 방지 (클라이언트 측)
      if (submittedIds.includes(submissionId)) {
        alert('이미 피드백을 작성한 글입니다.');
        return;
      }

      // 🛡️ 추가 검증: allSubmissions에서 이미 피드백한 글인지 확인
      const targetSubmission = allSubmissions.find(sub => sub._id === submissionId);
      if (targetSubmission && targetSubmission.hasGivenFeedback) {
        alert('이미 피드백을 작성한 글입니다. 페이지를 새로고침해주세요.');
        return;
      }

      try {
        setIsSubmittingFeedback(true);
        const token = await user.getIdToken();
        if (!token) return;

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/feedback`,
          {
            toSubmissionId: submissionId,
            content: feedback,
            fromUid: user.uid,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          // 성공 시 상태 업데이트
          setSubmittedIds(prev => [...prev, submissionId]);
          setGivenFeedbacks(prev => [...prev, response.data.feedback]);

          // 오늘 피드백 카운트 업데이트
          setTodayFeedbackCount(prev => ({
            ...prev,
            total: prev.total + 1,
            mode_300: prev.mode_300 + 1, // 또는 적절한 모드 계산
          }));

          // localStorage 업데이트
          if (user?.uid) {
            try {
              const updatedCount = {
                ...todayFeedbackCount,
                total: todayFeedbackCount.total + 1,
                mode_300: todayFeedbackCount.mode_300 + 1,
              };
              localStorage.setItem(`todayFeedbackCount_${user.uid}`, JSON.stringify(updatedCount));
            } catch (e) {
              console.warn('localStorage 업데이트 실패:', e);
            }
          }
        }
      } catch (error) {
        console.error('피드백 제출 실패:', error);
        throw error;
      } finally {
        setIsSubmittingFeedback(false);
      }
    },
    [user?.uid, todayFeedbackCount]
  );

  // 구조화된 피드백 제출 핸들러 추가
  const handleSubmitStructuredFeedback = async (
    submissionId: string,
    feedback: StructuredFeedback
  ) => {
    if (!user) return;

    // 전체적인 느낌만 필수로 검증 (최소 15자)
    if (
      !feedback.overall ||
      feedback.overall.trim().length < CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL
    ) {
      alert(
        `전체적인 느낌은 최소 ${CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL}자 이상 작성해야 합니다.`
      );
      return;
    }

    // strengths와 improvements는 선택사항이므로 검증하지 않음

    try {
      setIsSubmittingFeedback(true); // ✅ 피드백 제출 전용 로딩 상태

      // 디버깅: 전송할 데이터 로깅
      const feedbackData = {
        toSubmissionId: submissionId,
        fromUid: user.uid,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        overall: feedback.overall || null,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userOffset: new Date().getTimezoneOffset(),
      };

      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        alert('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      // ✅ 안정적인 axios 사용으로 복구
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/feedback`,
        feedbackData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ 즉시 성공 메시지 표시 (이메일 전송은 백그라운드에서 처리)
      const successMessage = generateFeedbackSuccessMessage(response.data);
      alert(successMessage);

      // ✅ submittedIds 상태 업데이트 복원 - 즉시 UI에 반영
      setSubmittedIds(prev => [...prev, submissionId]);

      // ✅ 피드백 현황 새로고침 (단순화)
      fetchInitialData().catch(err => {
        console.warn('피드백 현황 새로고침 실패:', err);
      });

      // 피드백 입력 초기화
      setFeedbacks(prev => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[submissionId];
        return newFeedbacks;
      });

      setExpanded(null);
    } catch (err) {
      // ✅ axios 에러 처리로 복구하면서 개선된 메시지 유지
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
      } else {
        // 예상치 못한 에러
        alert('❌ 피드백 제출에 실패했습니다.\n\n' + '문제가 지속되면 관리자에게 문의해 주세요.');
      }
      logger.error('피드백 제출 실패:', err);
    } finally {
      setIsSubmittingFeedback(false); // ✅ 피드백 제출 전용 로딩 상태 해제
    }
  };

  // 상세한 언락 상태 계산 함수 (새로 추가)
  const getDetailedUnlockStatus = useCallback(() => {
    const hasMode300 = todaySubmissionModes.has('mode_300');
    const hasMode1000 = todaySubmissionModes.has('mode_1000');

    // 300자 모드 언락 상태
    const mode300Unlocked =
      hasMode300 &&
      todayFeedbackCount.mode_300 + todayFeedbackCount.mode_1000 >= CONFIG.FEEDBACK.REQUIRED_COUNT;

    // 1000자 모드 언락 상태
    const mode1000Unlocked = hasMode1000 && todayFeedbackCount.mode_1000 >= 1;

    // 교차 피드백 활용 여부
    const crossModeUsedFor300 =
      hasMode300 && mode300Unlocked && todayFeedbackCount.mode_300 < CONFIG.FEEDBACK.REQUIRED_COUNT;

    const crossModeUsedFor1000 =
      hasMode1000 && mode1000Unlocked && todayFeedbackCount.mode_1000 < 1;

    return {
      mode300: {
        unlocked: mode300Unlocked,
        progress: todayFeedbackCount.mode_300,
        required: CONFIG.FEEDBACK.REQUIRED_COUNT,
        crossModeUsed: crossModeUsedFor300,
        crossModeCount: hasMode300
          ? Math.max(0, CONFIG.FEEDBACK.REQUIRED_COUNT - todayFeedbackCount.mode_300)
          : 0,
        hasSubmission: hasMode300,
      },
      mode1000: {
        unlocked: mode1000Unlocked,
        progress: todayFeedbackCount.mode_1000,
        required: 1,
        crossModeUsed: crossModeUsedFor1000,
        crossModeCount: hasMode1000 ? Math.max(0, 1 - todayFeedbackCount.mode_1000) : 0,
        hasSubmission: hasMode1000,
      },
      total: {
        unlocked: mode300Unlocked && mode1000Unlocked,
        progress: todayFeedbackCount.total,
        required: CONFIG.FEEDBACK.REQUIRED_COUNT,
      },
    };
  }, [todaySubmissionModes, todayFeedbackCount]);

  // 교차 피드백 성공 메시지 생성 함수 (새로 추가)
  const generateFeedbackSuccessMessage = useCallback((result: any) => {
    const { crossModeInfo, todayFeedbackCount } = result;

    if (!crossModeInfo) {
      return '✅ 피드백이 성공적으로 저장되었습니다!';
    }

    let message = '✅ 피드백이 성공적으로 저장되었습니다!\n\n';

    // 300자 모드 언락 상태
    if (crossModeInfo.mode300Unlocked) {
      message += `🎉 300자 모드 언락 완료!\n`;
      if (crossModeInfo.mode300Progress.crossMode > 0) {
        message += `💡 교차 피드백으로 언락되었습니다!\n`;
        message += `   (300자 ${crossModeInfo.mode300Progress.direct}개 + 1000자 ${crossModeInfo.mode300Progress.crossMode}개)\n`;
      }
      message += '\n';
    } else {
      message += `📊 300자 모드 진행도: ${crossModeInfo.mode300Progress.total}/${crossModeInfo.mode300Progress.required}\n`;
      if (crossModeInfo.mode300Progress.crossMode > 0) {
        message += `💡 교차 피드백 활용: 1000자 글에 ${crossModeInfo.mode300Progress.crossMode}개 작성\n`;
      }
      message += `언락까지: ${crossModeInfo.mode300Progress.remaining}개 더 필요\n\n`;
    }

    // 1000자 모드 언락 상태
    if (crossModeInfo.mode1000Unlocked) {
      message += `🎉 1000자 모드 언락 완료!\n\n`;
    } else if (crossModeInfo.mode1000Progress.direct > 0) {
      message += `📊 1000자 모드 진행도: ${crossModeInfo.mode1000Progress.direct}/${crossModeInfo.mode1000Progress.required}\n`;
      message += `언락까지: ${crossModeInfo.mode1000Progress.remaining}개 더 필요\n\n`;
    }

    // 전체 미션 완료 여부
    if (crossModeInfo.mode300Unlocked && crossModeInfo.mode1000Unlocked) {
      message += `🏆 모든 피드백 미션 완료!\n`;
      message += `오늘 작성한 모든 글의 피드백을 볼 수 있습니다!`;
    } else if (crossModeInfo.mode300Progress.crossMode > 0) {
      message += `💡 교차 피드백의 장점!\n`;
      message += `300자 모드의 피드백을 3개 채우지 않아도,\n`;
      message += `1000자 모드 피드백과 함께 총 3개가 되면 언락됩니다!`;
    }

    return message;
  }, []);

  // 피드백 열람 권한 상태 확인 함수
  const checkFeedbackUnlockStatus = useCallback(
    async (submissionId?: string) => {
      if (!user) return { hasUnlocked: false, unlockMethod: null };

      try {
        const token = await user.getIdToken();
        if (!token) return { hasUnlocked: false, unlockMethod: null };

        // 1. 황금열쇠로 언락했는지 확인
        if (submissionId) {
          const submissionRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/submit/${submissionId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (submissionRes.data.feedbackUnlocked) {
            return { hasUnlocked: true, unlockMethod: 'golden_key' };
          }
        }

        // 2. 피드백 미션으로 언락했는지 확인
        const feedbackRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { mode_300, mode_1000 } = feedbackRes.data;
        const hasMode1000 = todaySubmissionModes.has('mode_1000');
        const hasMode300 = todaySubmissionModes.has('mode_300');

        const isMode300Completed = hasMode300 && mode_300 >= CONFIG.FEEDBACK.REQUIRED_COUNT;
        const isMode1000Completed = hasMode1000 && mode_1000 >= 1;

        if (isMode300Completed && isMode1000Completed) {
          return { hasUnlocked: true, unlockMethod: 'feedback_mission' };
        }

        return { hasUnlocked: false, unlockMethod: null };
      } catch (error) {
        console.error('❌ 피드백 언락 상태 확인 실패:', error);
        return { hasUnlocked: false, unlockMethod: null };
      }
    },
    [user, todaySubmissionModes]
  );

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
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
            <p className="text-lg font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-lg">
              피드백 미션을 불러오는 중...
            </p>
          </div>
        </div>
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

        <FeedbackStats
          feedbackStats={{
            totalSubmissions: totalSubmissionsCount,
            unlockedSubmissions: 0, // TODO: 실제 값으로 업데이트
            feedbackGiven: todayFeedbackCount.total,
            feedbackReceived: 0, // TODO: 실제 값으로 업데이트
            unlockRate: 0, // TODO: 실제 값으로 업데이트
          }}
          todayFeedbackCount={todayFeedbackCount}
          dailyFeedbackCount={todayFeedbackCount.total}
          weeklyGrowth={weeklyGrowth}
          detailedUnlockStatus={getDetailedUnlockStatus()}
        />

        <FeedbackGuidance
          dailyFeedbackCount={todayFeedbackCount.total}
          todayFeedbackCount={todayFeedbackCount}
          availableModes={todaySubmissionModes}
          isExpanded={isGuideExpanded}
          onToggleExpand={() => setIsGuideExpanded(!isGuideExpanded)}
          detailedUnlockStatus={getDetailedUnlockStatus()}
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

        {/* 내가 작성한 피드백(날짜 필터와 무관) */}
        {(viewMode === 'all' || viewMode === 'written') && (
          <MyFeedbacks
            submissions={filteredData.submissions}
            feedbacks={filteredData.givenFeedbacks}
            visibleCount={visibleMyFeedbacks}
            onLoadMore={() => setVisibleMyFeedbacks(prev => prev + 3)}
            totalCount={filteredData.givenFeedbacks.length}
          />
        )}

        {/* 피드백 가능한 글(여기에만 날짜 필터 적용) */}
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
            <DateRangeFilter
              items={filteredData.submissions}
              getDate={item => item.createdAt}
              highlightDates={allSubmissionDates.map(dateStr => new Date(dateStr))}
            >
              {dateFilteredSubmissions => (
                <>
                  <FeedbackList
                    submissions={dateFilteredSubmissions}
                    feedbacks={feedbacks}
                    expanded={expanded}
                    submittedIds={submittedIds}
                    onFeedbackChange={(id, value) =>
                      setFeedbacks(prev => ({ ...prev, [id]: value }))
                    }
                    onSubmitFeedback={handleFeedbackSubmit}
                    onStructuredFeedbackSubmit={handleSubmitStructuredFeedback}
                    onToggleExpand={id => setExpanded(expanded === id ? null : id)}
                    lastSubmissionElementRef={lastSubmissionElementRef}
                    totalAvailable={
                      activeTab === 'all'
                        ? counts.available
                        : activeTab === 'mode_300'
                          ? counts.available_300
                          : counts.available_1000
                    }
                    isLoadingMore={isLoadingMore}
                    isSubmittingFeedback={isSubmittingFeedback} // ✅ 피드백 제출 로딩 상태 전달
                  />
                </>
              )}
            </DateRangeFilter>
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
