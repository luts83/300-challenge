// src/pages/FeedbackCamp.tsx
import React, { useEffect, useState, useMemo } from 'react';
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
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300); // 300ms 후 반영

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

  // counts 계산
  const counts = useMemo(() => {
    const mode300Count = allSubmissions.filter(sub => sub.mode === 'mode_300').length;
    const mode1000Count = allSubmissions.filter(sub => sub.mode === 'mode_1000').length;

    return {
      all: allSubmissions.length,
      mode_300: mode300Count,
      mode_1000: mode1000Count,
      written: givenFeedbacks.length,
      available: allSubmissions.filter(sub => !submittedIds.includes(sub._id)).length,
    };
  }, [allSubmissions, givenFeedbacks, submittedIds]);

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
  }, [allSubmissions, givenFeedbacks, activeTab, searchQuery, sortBy, sortOrder, submittedIds]);

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

  const fetchAllSubmissions = async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/all-submissions/${user.uid}`
      );
      setAllSubmissions(res.data);

      // 추가: 이미 피드백을 남긴 글의 id를 submittedIds에 세팅
      const alreadySubmitted = res.data
        .filter((sub: any) => sub.hasGivenFeedback)
        .map((sub: any) => sub._id);
      setSubmittedIds(alreadySubmitted);
    } catch (err) {
      logger.error('❌ 전체 글 목록 불러오기 실패:', err);
      setError('글 목록을 불러오지 못했습니다.');
    }
  };

  const fetchMySubmissionStatus = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`);
      const submissions = res.data;

      const today = new Date().toISOString().slice(0, 10);
      const todaySubmissions = submissions.filter((sub: any) => sub.submissionDate === today);

      setHasMySubmission(submissions.length > 0);

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

      // 피드백 3개 달성 시
      if (todayCount === CONFIG.FEEDBACK.REQUIRED_COUNT) {
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
          alert(
            '❌ 피드백을 남기기 위해서는 오늘 글을 작성해야 합니다!\n\n' +
              '1. 먼저 오늘의 글쓰기를 완료해 주세요.\n' +
              '2. 글쓰기 완료 후 다시 피드백을 남겨주세요.\n\n' +
              '✍️ 글쓰기 페이지로 이동하시겠습니까?'
          ).then(result => {
            if (result) {
              navigate('/write'); // 글쓰기 페이지로 이동
            }
          });
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
    if (user) {
      Promise.all([fetchMySubmissionStatus(), fetchAllSubmissions(), fetchGivenFeedbacks()]);
    }
  }, [user, page, activeTab]);

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

  if (!user) return <p className="msg-auth">로그인이 필요합니다.</p>;
  if (loading) return <p className="msg-auth">로딩 중...</p>;
  if (error) return <p className="msg-error">에러: {error}</p>;
  if (!hasMySubmission) {
    return <p className="msg-submit-note">✍ 먼저 글을 작성해야 피드백 미션을 진행할 수 있어요!</p>;
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">🤝 피드백 미션</h1>

      <div className="mb-4 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-base text-center font-medium">
        ✍ 다른 사람의 글에 피드백을 작성하고, 내가 쓴 글의 피드백도 확인해보세요!
      </div>

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
        (filteredData.submissions.length === 0 ? (
          <p className="text-center py-8 text-gray-700 bg-white/80 rounded-lg shadow-sm">
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
          />
        ))}

      <ScrollToTop />
    </div>
  );
};

export default FeedbackCamp;
