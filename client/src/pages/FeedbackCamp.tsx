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
        const today = new Date().toISOString().slice(0, 10);

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

  // 내가 작성한 피드백 가져오기
  const fetchGivenFeedbacks = async () => {
    if (!user) return;
    try {
      const modeParam = activeTab === 'all' ? '' : `&mode=${encodeURIComponent(activeTab)}`;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}?page=1&limit=1000${modeParam}`
      );
      setGivenFeedbacks(res.data.feedbacks);
      setTotalFeedbacks(res.data.total);
      setTodaySummary(res.data.todaySummary);
    } catch (err) {
      logger.error('내가 작성한 피드백 조회 실패:', err);
    }
  };

  // setTodayFeedbackCount를 래핑하여 localStorage에 자동 저장
  const updateTodayFeedbackCount = useCallback(
    (newCount: typeof todayFeedbackCount) => {
      setTodayFeedbackCount(newCount);

      // localStorage에 저장
      if (user?.uid) {
        const key = `todayFeedbackCount_${user.uid}`;
        const dateKey = `todayFeedbackCount_date_${user.uid}`;
        const today = new Date().toISOString().slice(0, 10);
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

    try {
      // 현재 피드백 상태 확인
      const feedbackRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`
      );
      const { mode_300, mode_1000, total } = feedbackRes.data;

      // 현재 글 작성 모드 확인
      const submissionRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`
      );
      const submissions = Array.isArray(submissionRes.data)
        ? submissionRes.data
        : submissionRes.data.submissions || [];

      const today = new Date().toISOString().slice(0, 10);
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
        total >= CONFIG.FEEDBACK.REQUIRED_COUNT &&
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

        // 사용자에게 알림
        if (newMode300 > 0 || newMode1000 > 0) {
          let message = '🎉 피드백 미션 완료 후 추가로 글을 작성하셨네요!\n\n';
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
        // localStorage에서 복원된 상태라도 소급 적용 확인 필요
        setTimeout(() => {
          checkAndApplyRetroactiveFeedback();
        }, 1000); // 1초 후 소급 적용 확인
      }

      // ✅ localStorage 상태와 관계없이 피드백 목록은 항상 가져오기 (한 번만)
      if (givenFeedbacks.length === 0) {
        fetchGivenFeedbacks(); // 내가 쓴 피드백 목록 가져오기
      }
    }
  }, [user, isStateRestored]); // checkAndApplyRetroactiveFeedback 의존성도 제거

  useEffect(() => {
    const fetchPopularSubmissions = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/popular?limit=10`);
        const shuffled = res.data.sort(() => 0.5 - Math.random());
        setHighlightedSubmissions(shuffled.slice(0, 3));
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
    // 전체 날짜 리스트 받아오기
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/feedback/all-dates/${user.uid}`)
      .then(res => {
        setAllSubmissionDates(res.data.dates || []);
      })
      .catch(() => setAllSubmissionDates([]));
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
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/stats/${user.uid}`
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
    const today = new Date().toISOString().slice(0, 10);

    console.log('🔍 localStorage 디버깅 정보:', {
      userUid: user.uid,
      key,
      dateKey,
      saved,
      savedDate,
      today,
      hasSaved: !!saved,
      hasSavedDate: !!savedDate,
      isToday: savedDate === today,
      parsedValue: saved ? JSON.parse(saved) : null,
      currentState: todayFeedbackCount,
    });
  }, [user?.uid, todayFeedbackCount]);

  // 전역 객체에 디버깅 함수 등록
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugLocalStorage = debugLocalStorage;
    }
  }, [debugLocalStorage]);

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

      // 피드백 소급 적용 확인 (글 작성 후 호출되는 경우)
      if (todaySubmissions.length > 0) {
        await checkAndApplyRetroactiveFeedback();
      }
    } catch (err) {
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
      setLoading(true);

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

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        toSubmissionId: submissionId,
        fromUid: user.uid,
        content: feedbackContent,
        userTimezone: userTimezone,
        userOffset: userOffset,
      });

      // 기존 진행률 바 갱신 (서버 응답 데이터 구조에 맞게 수정)
      const { mode_300, mode_1000, total } = response.data.todayFeedbackCount || {
        mode_300: 0,
        mode_1000: 0,
        total: 0,
      };
      setDailyFeedbackCount({ mode300: mode_300, mode1000: mode_1000 });

      // ✅ 추가: 모드별 카운트도 즉시 갱신 (localStorage에 자동 저장)
      updateTodayFeedbackCount({
        mode_300: mode_300,
        mode_1000: mode_1000,
        total: total,
      });

      // 사용자의 모드에 따라 다른 메시지 표시
      const hasMode1000 = todaySubmissionModes.has('mode_1000');
      const hasMode300 = todaySubmissionModes.has('mode_300');

      // 이미 미션을 완료했는지 확인
      const isMissionCompleted =
        hasMode1000 && mode_1000 >= 1 && hasMode300 && total >= CONFIG.FEEDBACK.REQUIRED_COUNT;

      let message = '✅ 피드백이 제출되었습니다.\n\n';

      if (isMissionCompleted) {
        // 이미 미션을 완료한 경우 격려 메시지
        message = `🎉 이미 오늘의 피드백 미션을 완료하셨지만, 추가 피드백을 남겨주셔서 감사합니다!\n\n`;
        message += `💝 다른 사용자들의 글쓰기 성장에 기여하고 계시는군요.\n`;
        message += `✨ 지속적인 피드백은 커뮤니티 전체의 발전을 이끌어냅니다.`;
      } else {
        // 아직 미션을 완료하지 않은 경우 기존 메시지
        // 1000자 모드 언락 체크
        if (hasMode1000 && mode_1000 >= 1) {
          message += `🎉 축하합니다! 1000자 글에 대한 피드백 열람 권한이 언락되었습니다!\n`;
        } else if (hasMode1000) {
          message += `1000자 글 언락까지: ${mode_1000}/1\n`;
        }

        // 300자 모드 언락 체크
        if (hasMode300 && total >= CONFIG.FEEDBACK.REQUIRED_COUNT) {
          message += `🎉 축하합니다! 300자 글에 대한 피드백 열람 권한이 언락되었습니다!\n`;
        } else if (hasMode300) {
          message += `300자 글 언락까지: ${total}/${CONFIG.FEEDBACK.REQUIRED_COUNT}\n`;
        }

        // 모든 언락이 완료된 경우
        if (
          hasMode1000 &&
          mode_1000 >= 1 &&
          hasMode300 &&
          total >= CONFIG.FEEDBACK.REQUIRED_COUNT
        ) {
          message = `🎉 축하합니다!\n오늘 작성하신 모든 글에 대한 피드백 열람 권한이 모두 언락되었습니다!`;
        }
      }

      alert(message);

      // 상태 업데이트 - 즉시 UI에 반영
      setSubmittedIds(prev => {
        const newIds = [...prev, submissionId];
        return newIds;
      });

      // 피드백 입력 초기화
      setFeedbacks(prev => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[submissionId];
        return newFeedbacks;
      });

      // 확장된 글 접기
      setExpanded(null);

      // 페이지 상태 업데이트 - 순차적으로 처리하여 상태 일관성 보장
      try {
        // 1. 먼저 내가 쓴 피드백 목록 업데이트
        await fetchGivenFeedbacks();

        // 2. 전체 제출물 목록 업데이트
        await fetchAllSubmissions(1, true); // reset = true로 전체 새로고침

        // 3. 내 제출 상태 업데이트
        await fetchMySubmissionStatus();

        // 4. 이미 setTodayFeedbackCount로 업데이트했으므로 중복 API 호출 제거
        // setTodayFeedbackCount는 서버 응답으로 이미 최신 상태로 업데이트됨

        // 5. 서버 데이터 동기화를 위해 잠시 후 최신 데이터 확인 (선택사항)
        setTimeout(async () => {
          try {
            const latestRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`
            );
            // 서버 데이터가 더 최신이면 업데이트
            if (latestRes.data.total > total) {
              updateTodayFeedbackCount(latestRes.data);
            }
          } catch (syncError) {
            console.log('서버 동기화 실패 (무시됨):', syncError);
          }
        }, 1000); // 1초 후 동기화
      } catch (updateError) {
        console.error('❌ 데이터 업데이트 중 오류:', updateError);
        // 업데이트 실패해도 사용자에게는 성공 메시지가 이미 표시됨
      }
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

  // 구조화된 피드백 제출 핸들러 추가
  const handleSubmitStructuredFeedback = async (
    submissionId: string,
    feedback: StructuredFeedback
  ) => {
    if (!user) return;

    // 피드백 최소 길이 검증
    if (
      !feedback.strengths ||
      feedback.strengths.trim().length < CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS
    ) {
      alert(
        `장점은 최소 ${CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.STRENGTHS}자 이상 작성해야 합니다.`
      );
      return;
    }
    if (
      !feedback.improvements ||
      feedback.improvements.trim().length < CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS
    ) {
      alert(
        `개선점은 최소 ${CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.IMPROVEMENTS}자 이상 작성해야 합니다.`
      );
      return;
    }
    if (
      feedback.overall &&
      feedback.overall.trim().length < CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL
    ) {
      alert(
        `전체 의견은 최소 ${CONFIG.FEEDBACK.STRUCTURED.MIN_LENGTH.OVERALL}자 이상 작성해야 합니다.`
      );
      return;
    }

    try {
      setLoading(true);

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

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/feedback`,
        feedbackData
      );

      // 기존 진행률 바 갱신 (서버 응답 데이터 구조에 맞게 수정)
      const { mode_300, mode_1000, total } = response.data.todayFeedbackCount || {
        mode_300: 0,
        mode_1000: 0,
        total: 0,
      };
      setDailyFeedbackCount({ mode300: mode_300, mode1000: mode_1000 });

      // ✅ 추가: 모드별 카운트도 즉시 갱신 (localStorage에 자동 저장)
      updateTodayFeedbackCount({
        mode_300: mode_300,
        mode_1000: mode_1000,
        total: total,
      });

      // 먼저 내 글 상태를 업데이트하여 todaySubmissionModes를 최신화
      await fetchMySubmissionStatus();

      // 사용자의 모드에 따라 다른 메시지 표시 (업데이트된 todaySubmissionModes 사용)
      const hasMode1000 = todaySubmissionModes.has('mode_1000');
      const hasMode300 = todaySubmissionModes.has('mode_300');

      // 이미 미션을 완료했는지 확인
      const isMissionCompleted =
        hasMode1000 && mode_1000 >= 1 && hasMode300 && total >= CONFIG.FEEDBACK.REQUIRED_COUNT;

      let message = '✅ 피드백이 제출되었습니다.\n\n';

      if (isMissionCompleted) {
        // 이미 미션을 완료한 경우 격려 메시지
        message = `🎉 이미 오늘의 피드백 미션을 완료하셨지만, 추가 피드백을 남겨주셔서 감사합니다!\n\n`;
        message += `💝 다른 사용자들의 글쓰기 성장에 기여하고 계시는군요.\n`;
        message += `✨ 지속적인 피드백은 커뮤니티 전체의 발전을 이끌어냅니다.`;
      } else {
        // 아직 미션을 완료하지 않은 경우 기존 메시지
        // 1000자 모드 언락 체크
        if (hasMode1000 && mode_1000 >= 1) {
          message += `🎉 축하합니다! 1000자 글에 대한 피드백 열람 권한이 언락되었습니다!\n`;
        } else if (hasMode1000) {
          message += `1000자 글 언락까지: ${mode_1000}/1\n`;
        }

        // 300자 모드 언락 체크
        if (hasMode300 && total >= CONFIG.FEEDBACK.REQUIRED_COUNT) {
          message += `🎉 축하합니다! 300자 글에 대한 피드백 열람 권한이 언락되었습니다!\n`;
        } else if (hasMode300) {
          message += `300자 글 언락까지: ${total}/${CONFIG.FEEDBACK.REQUIRED_COUNT}\n`;
        }

        // 모든 언락이 완료된 경우
        if (
          hasMode1000 &&
          mode_1000 >= 1 &&
          hasMode300 &&
          total >= CONFIG.FEEDBACK.REQUIRED_COUNT
        ) {
          message = `🎉 축하합니다!\n오늘 작성하신 모든 글에 대한 피드백 열람 권한이 모두 언락되었습니다!`;
        }
      }

      alert(message);

      // 상태 업데이트 - 즉시 UI에 반영
      setSubmittedIds(prev => {
        const newIds = [...prev, submissionId];
        return newIds;
      });

      // 피드백 입력 초기화
      setFeedbacks(prev => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[submissionId];
        return newFeedbacks;
      });

      // 확장된 글 접기
      setExpanded(null);

      // 페이지 상태 업데이트 - 순차적으로 처리하여 상태 일관성 보장
      try {
        // 1. 먼저 내가 쓴 피드백 목록 업데이트
        await fetchGivenFeedbacks();

        // 2. 전체 제출물 목록 업데이트
        await fetchAllSubmissions(1, true); // reset = true로 전체 새로고침

        // 3. 내 제출 상태 업데이트
        await fetchMySubmissionStatus();

        // 4. 이미 setTodayFeedbackCount로 업데이트했으므로 중복 API 호출 제거
        // setTodayFeedbackCount는 서버 응답으로 이미 최신 상태로 업데이트됨

        // 5. 서버 데이터 동기화를 위해 잠시 후 최신 데이터 확인 (선택사항)
        setTimeout(async () => {
          try {
            const latestRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/feedback/given-today/${user.uid}`
            );
            // 서버 데이터가 더 최신이면 업데이트
            if (latestRes.data.total > total) {
              updateTodayFeedbackCount(latestRes.data);
            }
          } catch (syncError) {
            console.log('서버 동기화 실패 (무시됨):', syncError);
          }
        }, 1000); // 1초 후 동기화
      } catch (updateError) {
        console.error('❌ 데이터 업데이트 중 오류:', updateError);
        // 업데이트 실패해도 사용자에게는 성공 메시지가 이미 표시됨
      }
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
          todayFeedbackCount={todayFeedbackCount}
          dailyFeedbackCount={todayFeedbackCount.total}
          weeklyGrowth={weeklyGrowth}
        />

        <FeedbackGuidance
          dailyFeedbackCount={{
            mode300: todayFeedbackCount.mode_300,
            mode1000: todayFeedbackCount.mode_1000,
          }}
          todayFeedbackCount={todayFeedbackCount}
          availableModes={todaySubmissionModes}
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
