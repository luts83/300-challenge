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

// 기존의 local export type Submission 제거
// import { Submission } from '../components/FeedbackCamp'; // 이미 import 되어 있으면 이 줄만 남기고, 아니면 올바른 경로로 import

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

  useEffect(() => {
    if (user) {
      // localStorage에서 저장된 피드백 카운트 복원
      try {
        const key = `todayFeedbackCount_${user.uid}`;
        const dateKey = `todayFeedbackCount_date_${user.uid}`;
        const saved = localStorage.getItem(key);
        const savedDate = localStorage.getItem(dateKey);
        const today = getUserTodayDate();

        if (saved && savedDate === today) {
          const parsed = JSON.parse(saved);
          setTodayFeedbackCount(parsed);
          setIsStateRestored(true); // 상태 복원 플래그 설정
        } else {
          setIsStateRestored(false);
        }
      } catch (e) {
        console.error('❌ localStorage에서 피드백 카운트 복원 실패:', e);
        setIsStateRestored(false);
      }
    }
  }, [user]); // user만 의존성으로 설정

  // 오늘의 피드백 현황 불러오기
  const fetchTodayFeedbackCount = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const token = await user.getIdToken();
      if (!token) return;

      // 유저의 로컬타임 정보 가져오기
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();

      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}?timezone=${userTimezone}&offset=${userOffset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newTodayFeedbackCount = {
        mode_300: data.mode_300 || 0,
        mode_1000: data.mode_1000 || 0,
        total: data.total || 0,
      };

      setTodayFeedbackCount(newTodayFeedbackCount);

      // localStorage에 저장
      localStorage.setItem(`todayFeedbackCount_${user.uid}`, JSON.stringify(newTodayFeedbackCount));
    } catch (error) {
      console.error('❌ [피드백 현황] 네트워크/API 오류:', {
        userUid: user?.uid,
        error,
      });
    }
  }, [user?.uid]);

  // 내가 쓴 피드백 불러오기
  const fetchGivenFeedbacks = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const token = await user.getIdToken();
      if (!token) return;

      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setGivenFeedbacks(data.feedbacks || []);

      // 오늘의 피드백 카운트 계산
      const todayString = getUserTodayDate();

      const todayFeedbacks =
        data.feedbacks?.filter((fb: any) => fb.writtenDate === todayString) || [];

      const mode300Count = todayFeedbacks.filter(
        (fb: any) => (fb.mode || fb.toSubmissionId?.mode) === 'mode_300'
      ).length;
      const mode1000Count = todayFeedbacks.filter(
        (fb: any) => (fb.mode || fb.toSubmissionId?.mode) === 'mode_1000'
      ).length;

      const newTodayFeedbackCount = {
        mode_300: mode300Count,
        mode_1000: mode1000Count,
        total: mode300Count + mode1000Count,
      };

      setTodayFeedbackCount(newTodayFeedbackCount);

      // localStorage에 저장
      localStorage.setItem(`todayFeedbackCount_${user.uid}`, JSON.stringify(newTodayFeedbackCount));
    } catch (error) {
      console.error('❌ [피드백 미션] 네트워크/API 오류:', {
        userUid: user?.uid,
        error,
      });
    }
  }, [user?.uid, activeTab]);

  // setTodayFeedbackCount를 래핑하여 localStorage에 자동 저장
  const updateTodayFeedbackCount = useCallback(
    (newCount: typeof todayFeedbackCount) => {
      setTodayFeedbackCount(newCount);

      // localStorage에 저장
      if (user?.uid) {
        const key = `todayFeedbackCount_${user.uid}`;
        const dateKey = `todayFeedbackCount_date_${user.uid}`;
        const today = getUserTodayDate();
        try {
          localStorage.setItem(key, JSON.stringify(newCount));
          localStorage.setItem(dateKey, today);
        } catch (error) {
          console.error('❌ localStorage 저장 실패:', error);
        }
      } else {
        console.warn('⚠️ user.uid가 없어 localStorage 저장 실패:', {
          user: user,
          userType: typeof user,
          userKeys: user ? Object.keys(user) : 'user is null',
        });
      }
    },
    [user?.uid]
  );

  // 피드백 미션 완료 후 추가 글 작성 시 기존 피드백 소급 적용
  const checkAndApplyRetroactiveFeedback = useCallback(async () => {
    if (!user) return;

    // 이미 실행되었는지 확인
    const hasCheckedRetroactive = localStorage.getItem(
      `retroactive_checked_${user.uid}_${getUserTodayDate()}`
    );
    if (hasCheckedRetroactive === 'true') {
      // 피드백 소급 적용 이미 확인됨
      return;
    }

    try {
      const token = await user.getIdToken();
      if (!token) return;

      // 현재 피드백 상태 확인
      const feedbackRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const { mode_300, mode_1000, total } = feedbackRes.data;

      // 현재 글 작성 모드 확인
      const submissionRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const submissions = Array.isArray(submissionRes.data)
        ? submissionRes.data
        : submissionRes.data.submissions || [];

      const today = getUserTodayDate();
      const todaySubmissions = submissions.filter((sub: any) => sub.submissionDate === today);
      const currentModes = new Set(todaySubmissions.map((sub: any) => sub.mode));

      // 소급 적용 가능한지 확인
      let shouldUpdate = false;
      let newMode300 = mode_300;
      let newMode1000 = mode_1000;
      let newTotal = total;

      // 300자 모드 소급 적용 체크
      if (
        currentModes.has('mode_300') &&
        mode_300 >= CONFIG.FEEDBACK.REQUIRED_COUNT &&
        mode_300 === 0
      ) {
        // 기존 피드백이 3개 이상이고 300자 글을 썼지만 300자 모드 카운트가 0인 경우
        newMode300 = CONFIG.FEEDBACK.REQUIRED_COUNT;
        shouldUpdate = true;
      }

      // 1000자 모드 소급 적용 체크
      if (currentModes.has('mode_1000') && total >= 1 && mode_1000 === 0) {
        // 기존 피드백이 1개 이상이고 1000자 글을 썼지만 1000자 모드 카운트가 0인 경우
        newMode1000 = 1;
        shouldUpdate = true;
      }

      // 소급 적용이 필요한 경우 상태 업데이트
      if (shouldUpdate) {
        const updatedCount = {
          mode_300: newMode300,
          mode_1000: newMode1000,
          total: total,
        };

        updateTodayFeedbackCount(updatedCount);
        setDailyFeedbackCount({ mode300: newMode300, mode1000: newMode1000 });

        // 사용자에게 알림 (한 번만)
        if (newMode300 > 0 || newMode1000 > 0) {
          let message = '🎉 피드백 미션 완료 후 추가로 글을 작성하셨네요!\n\n';

          // 황금열쇠 사용 여부 확인
          const unlockStatus = await checkFeedbackUnlockStatus();

          if (unlockStatus.hasUnlocked && unlockStatus.unlockMethod === 'golden_key') {
            message += `🔑 이미 황금열쇠로 피드백을 언락하셨지만, 피드백 미션도 완료하셨네요!\n\n`;
          }

          if (newMode300 > 0) {
            message += `✅ 300자 모드: ${newMode300}/${CONFIG.FEEDBACK.REQUIRED_COUNT} 완료 (피드백 열람 권한 언락됨)\n`;
          }
          if (newMode1000 > 0) {
            message += `✅ 1000자 모드: ${newMode1000}/1 완료 (피드백 열람 권한 언락됨)\n`;
          }
          message += '\n💡 기존 피드백이 새로 작성한 글에도 자동으로 적용되었습니다.';

          alert(message);
        }
      }

      // 실행 완료 표시 (오늘 날짜로)
      localStorage.setItem(`retroactive_checked_${user.uid}_${today}`, 'true');
      // 피드백 소급 적용 확인 완료
    } catch (error) {
      console.error('❌ 피드백 소급 적용 확인 실패:', error);
    }
  }, [user, updateTodayFeedbackCount]);

  // localStorage 상태 복원 후 API 호출 관리
  useEffect(() => {
    if (user && isStateRestored !== null) {
      // 🔍 유저 시간 정보 간단 로그
      const userOffset = new Date().getTimezoneOffset();
      console.log('🌍 유저 시간:', {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: userOffset,
        time: new Date().toLocaleString(),
      });

      // 기본 데이터 로드 (상태 복원과 관계없이 필요)
      fetchMySubmissionStatus(); // 오늘 글 작성 여부 확인 (소급 적용 포함)
      fetchAllSubmissions(); // 전체 피드백 대상 글 불러오기

      // localStorage에 상태가 없을 때만 API에서 피드백 카운트 가져오기
      if (!isStateRestored) {
        fetchGivenFeedbacks(); // 내가 쓴 피드백 불러오기
      } else {
        // localStorage에서 복원된 상태라도 소급 적용 확인 필요 (한 번만)
        const today = getUserTodayDate();
        const hasCheckedToday = localStorage.getItem(`retroactive_checked_${user.uid}_${today}`);

        if (hasCheckedToday !== 'true') {
          setTimeout(() => {
            checkAndApplyRetroactiveFeedback();
          }, 1000); // 1초 후 소급 적용 확인
        }
      }

      // ✅ localStorage 상태와 관계없이 피드백 목록은 항상 가져오기 (한 번만)
      if (givenFeedbacks.length === 0) {
        fetchGivenFeedbacks(); // 내가 쓴 피드백 목록 가져오기
      }

      // 오늘의 피드백 현황 API 호출
      fetchTodayFeedbackCount();
    }
  }, [user, isStateRestored, fetchGivenFeedbacks, fetchTodayFeedbackCount]); // checkAndApplyRetroactiveFeedback 의존성 제거

  useEffect(() => {
    const fetchPopularSubmissions = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        if (!token) return;

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/popular?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const shuffled = res.data.sort(() => 0.5 - Math.random());
        setHighlightedSubmissions(shuffled.slice(0, 3));
      } catch (err) {
        logger.error('인기 글 불러오기 실패:', err);
      }
    };

    fetchPopularSubmissions();
  }, [user]);

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

  // setTodaySubmissionModes에서 Set<'mode_300' | 'mode_1000'>로 명시적으로 생성
  const [todaySubmissionModes, setTodaySubmissionModes] = useState<Set<'mode_300' | 'mode_1000'>>(
    new Set<'mode_300' | 'mode_1000'>()
  );

  const [isGuideExpanded, setIsGuideExpanded] = useState(false);

  const [dailyFeedbackCount, setDailyFeedbackCount] = useState({
    mode300: 0,
    mode1000: 0,
  });

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

  const fetchAllSubmissions = async (pageNum = 1, reset = false) => {
    if (!user) return;
    try {
      if (pageNum > 1) setIsLoadingMore(true);

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
        setPage(1); // 페이지 번호도 리셋
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
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (page > 1) {
      fetchAllSubmissions(page);
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
    setAllSubmissions([]);
    setSubmittedIds([]);
    fetchAllSubmissions(1, true); // reset = true
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (!user) return;

    const fetchAllDates = async () => {
      try {
        const token = await user.getIdToken();
        if (!token) return;

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/feedback/all-dates/${user.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAllSubmissionDates(res.data.dates || []);
      } catch (error) {
        setAllSubmissionDates([]);
      }
    };

    fetchAllDates();
  }, [user]);

  // 이 useEffect는 localStorage에서 복원된 상태를 덮어쓰므로 제거
  // localStorage 상태 복원 로직에서 이미 처리하고 있음
  // useEffect(() => {
  //   if (!user) return;
  //   axios
  //     .get(`${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`)
  //     .then(res => updateTodayFeedbackCount(res.data))
  //     .catch(() => updateTodayFeedbackCount({ mode_300: 0, mode_1000: 0, total: 0 }));
  // }, [user, updateTodayFeedbackCount]);

  useEffect(() => {
    const fetchWeeklyGrowth = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        if (!token) return;

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/stats/${user.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setWeeklyGrowth({
          submissions: res.data.submissionsToday || 0,
          thisWeek: res.data.thisWeek || 0,
          lastWeek: res.data.lastWeek || 0,
        });
      } catch (err) {
        logger.error('주간 성장 데이터 불러오기 실패:', err);
      }
    };

    fetchWeeklyGrowth();
  }, [user]);

  // 디버깅용 함수 - 브라우저 콘솔에서 직접 호출 가능
  const debugLocalStorage = useCallback(() => {
    if (!user?.uid) {
      return;
    }

    const key = `todayFeedbackCount_${user.uid}`;
    const dateKey = `todayFeedbackCount_date_${user.uid}`;
    const saved = localStorage.getItem(key);
    const savedDate = localStorage.getItem(dateKey);
    const today = getUserTodayDate();

    // localStorage 디버깅 정보 제거
  }, [user?.uid, todayFeedbackCount]);

  // 오늘의 피드백 현황 디버깅 함수
  const debugTodayFeedbackStatus = useCallback(async () => {
    if (!user?.uid) {
      alert('사용자 정보가 없습니다.');
      return;
    }

    try {
      // 오늘의 피드백 현황 디버그 시작

      // 클라이언트 시간 정보
      const clientTime = new Date();
      const clientToday = getUserTodayDate();

      console.log('🕐 [디버그] 클라이언트 시간 정보:', {
        clientTime: clientTime.toLocaleString(),
        clientToday,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // 현재 상태 정보
      console.log('📊 [디버그] 현재 상태:', {
        todayFeedbackCount,
        givenFeedbacksCount: givenFeedbacks.length,
        allSubmissionsCount: allSubmissions.length,
      });

      // localStorage 정보
      const storedData = localStorage.getItem(`todayFeedbackCount_${user.uid}`);
      console.log('💾 [디버그] localStorage 데이터:', {
        storedData,
        parsedData: storedData ? JSON.parse(storedData) : null,
      });

      // API 직접 호출
      console.log('📡 [디버그] API 직접 호출 시작');

      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        console.error('❌ [디버그] 인증 토큰을 가져올 수 없습니다.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/feedback/today/${user.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const apiData = await response.json();

      console.log('📡 [디버그] API 응답:', {
        status: response.status,
        data: apiData,
      });

      // 최근 피드백 상세 정보
      const recentFeedbacks = givenFeedbacks.slice(0, 5);
      console.log(
        '📝 [디버그] 최근 5개 피드백:',
        recentFeedbacks.map(fb => ({
          id: fb._id,
          writtenDate: (fb as any).writtenDate,
          createdAt: fb.createdAt,
          mode: (fb as any).mode || (fb as any).toSubmissionId?.mode,
        }))
      );

      // 피드백 미션 상태 분석
      console.log('🎯 [디버그] 피드백 미션 상태 분석:', {
        hasTodayFeedback: todayFeedbackCount.total > 0,
        canWriteFeedback: allSubmissions.length > 0,
        feedbackTargets: allSubmissions.filter(sub => !sub.feedbackUnlocked).length,
        unlockedSubmissions: allSubmissions.filter(sub => sub.feedbackUnlocked).length,
      });

      // 결과 요약
      const summary = {
        clientToday,
        clientTime: clientTime.toLocaleString(),
        currentState: todayFeedbackCount,
        localStorageData: storedData ? JSON.parse(storedData) : null,
        apiResponse: apiData,
        recentFeedbacksCount: recentFeedbacks.length,
        missionStatus: {
          hasTodayFeedback: todayFeedbackCount.total > 0,
          canWriteFeedback: allSubmissions.length > 0,
          feedbackTargets: allSubmissions.filter(sub => !sub.feedbackUnlocked).length,
          unlockedSubmissions: allSubmissions.filter(sub => sub.feedbackUnlocked).length,
        },
      };

      console.log('📋 [디버그] 전체 요약:', summary);

      // 모바일용 alert
      alert(
        `디버그 완료!\n\n클라이언트 오늘: ${clientToday}\n현재 상태: ${JSON.stringify(todayFeedbackCount)}\nAPI 응답: ${JSON.stringify(apiData)}\n\n콘솔에서 자세한 정보를 확인하세요.`
      );
    } catch (error) {
      console.error('❌ [디버그] 오류:', error);
      alert(`디버그 오류: ${error}`);
    }
  }, [user?.uid, todayFeedbackCount, givenFeedbacks, allSubmissions]);

  // 모바일 친화적 간단 디버깅 함수
  const debugMobile = useCallback(() => {
    if (!user?.uid) {
      alert('사용자 정보가 없습니다.');
      return;
    }

    const info = {
      userUid: user.uid,
      currentTime: new Date().toISOString(),
      todayFeedbackCount,
      givenFeedbacks: givenFeedbacks?.length || 0,
      allSubmissions: allSubmissions?.length || 0,
      counts,
      localStorage: {
        todayFeedbackCount: localStorage.getItem(`todayFeedbackCount_${user.uid}`),
        date: localStorage.getItem(`todayFeedbackCount_date_${user.uid}`),
      },
    };

    // 모바일에서 보기 쉽게 alert로 표시
    alert(`📊 디버깅 정보:
사용자: ${info.userUid}
현재 시간: ${info.currentTime}
오늘 피드백 카운트: ${JSON.stringify(info.todayFeedbackCount)}
작성한 피드백: ${info.givenFeedbacks}개
전체 제출물: ${info.allSubmissions}개
카운트: ${JSON.stringify(info.counts)}
localStorage: ${JSON.stringify(info.localStorage)}`);

    // 콘솔에도 출력
    console.log('📱 모바일 디버깅:', info);
  }, [user?.uid, todayFeedbackCount, givenFeedbacks, allSubmissions, counts]);

  // 전역 객체에 디버깅 함수 등록
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugFeedbackCamp = {
        debugLocalStorage,
        debugTodayFeedbackStatus,
        debugMobile, // 모바일용 추가
        getCurrentState: () => ({
          todayFeedbackCount,
          givenFeedbacks: givenFeedbacks.length,
          allSubmissions: allSubmissions.length,
          counts,
          user: user?.uid,
        }),
      };
      console.log('🔧 디버깅 함수가 전역에 등록되었습니다. window.debugFeedbackCamp 사용 가능');
    }
  }, [
    debugLocalStorage,
    debugTodayFeedbackStatus,
    debugMobile,
    todayFeedbackCount,
    givenFeedbacks.length,
    allSubmissions.length,
    counts,
    user?.uid,
  ]);

  const fetchMySubmissionStatus = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      if (!token) return;

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const submissions = Array.isArray(res.data) ? res.data : res.data.submissions || [];

      const todayString = getUserTodayDate();

      console.log('🌍 [피드백 미션] 사용자 시간대 기준 날짜 계산:', {
        todayString,
        submissionDates: submissions.map((sub: any) => sub.submissionDate),
      });

      const todaySubmissions = submissions.filter((sub: any) => sub.submissionDate === todayString);

      const newHasMySubmission = todaySubmissions.length > 0;
      const modes = new Set(todaySubmissions.map((sub: any) => sub.mode));

      setHasMySubmission(newHasMySubmission); // ✅ 오늘 글 여부만 반영
      setTodaySubmissionModes(modes);

      // 피드백 소급 적용 확인 (글 작성 후 호출되는 경우)
      if (todaySubmissions.length > 0) {
        // 이미 오늘 확인했는지 체크
        const today = getUserTodayDate();
        const hasCheckedToday = localStorage.getItem(`retroactive_checked_${user.uid}_${today}`);

        if (hasCheckedToday !== 'true') {
          await checkAndApplyRetroactiveFeedback();
        }
      }
    } catch (err) {
      console.error('❌ [글 작성 상태] 내 글 존재 여부 확인 실패:', err);
      logger.error('내 글 존재 여부 확인 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (submissionId: string) => {
    if (!user) return;

    // 피드백 최소 길이 검증
    const feedbackContent = feedbacks[submissionId];
    if (!feedbackContent || feedbackContent.trim().length < CONFIG.FEEDBACK.MIN_LENGTH) {
      alert(`피드백은 최소 ${CONFIG.FEEDBACK.MIN_LENGTH}자 이상 작성해야 합니다.`);
      return;
    }

    try {
      setIsSubmittingFeedback(true); // ✅ 피드백 제출 전용 로딩 상태

      // 🔍 전송할 시간 정보 로깅
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();
      console.log('🚀 피드백 제출 - 전송할 시간 정보:', {
        userTimezone,
        userOffset,
        userOffsetHours: userOffset / 60,
        userLocalTime: new Date().toLocaleString(),
        description:
          userOffset === 0
            ? 'UTC/GMT'
            : userOffset === -60
              ? '영국 섬머타임 (UTC+1)'
              : userOffset === -540
                ? '한국 시간 (UTC+9)'
                : `UTC${userOffset > 0 ? '-' : '+'}${Math.abs(userOffset / 60)}`,
      });

      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        alert('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      // ✅ 안정적인 axios 사용으로 복구
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/feedback`,
        {
          toSubmissionId: submissionId,
          content: feedbackContent, // ✅ 서버 호환성을 위해 content 필드 사용
          userTimezone: userTimezone,
          userOffset: userOffset,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ 즉시 성공 메시지 표시 (이메일 전송은 백그라운드에서 처리)
      const successMessage = generateFeedbackSuccessMessage(response.data);
      alert(successMessage);

      // ✅ submittedIds 상태 업데이트 복원 - 즉시 UI에 반영
      setSubmittedIds(prev => [...prev, submissionId]);

      // ✅ 피드백 현황 새로고침 (비동기로 처리)
      Promise.all([fetchTodayFeedbackCount(), fetchGivenFeedbacks()]).catch(err => {
        console.warn('피드백 현황 새로고침 실패:', err);
        // 새로고침 실패는 사용자 경험에 영향을 주지 않음
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

      // ✅ 피드백 현황 새로고침 (비동기로 처리)
      Promise.all([fetchTodayFeedbackCount(), fetchGivenFeedbacks()]).catch(err => {
        console.warn('피드백 현황 새로고침 실패:', err);
        // 새로고침 실패는 사용자 경험에 영향을 주지 않음
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
                    onSubmitFeedback={handleSubmitFeedback}
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
