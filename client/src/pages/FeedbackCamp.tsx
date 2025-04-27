// src/pages/FeedbackCamp.tsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { FilterSection } from '../components/FilterSection/FilterSection';
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
  const [sortBy, setSortBy] = useState<'date' | 'feedback' | 'recent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'all' | 'written' | 'available'>('all');

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
      return 0;
    };

    filtered.submissions.sort(sortFn);
    filtered.givenFeedbacks.sort(sortFn);

    return filtered;
  }, [allSubmissions, givenFeedbacks, activeTab, searchQuery, sortBy, sortOrder]);

  const fetchGivenFeedbacks = async () => {
    if (!user) return;
    try {
      const modeParam = activeTab === 'all' ? '' : `&mode=${encodeURIComponent(activeTab)}`;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}?page=${page}&limit=10${modeParam}`
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

  const submitFeedback = async (submissionId: string, e: React.MouseEvent) => {
    if (!user) return;
    e.stopPropagation();
    const content = feedbacks[submissionId];
    if (!content || content.trim().length < CONFIG.FEEDBACK.MIN_LENGTH) {
      return alert(`피드백은 ${CONFIG.FEEDBACK.MIN_LENGTH}자 이상이어야 합니다.`);
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        toSubmissionId: submissionId,
        fromUid: user.uid,
        content,
      });
      alert('피드백이 저장되었습니다!');
      setSubmittedIds(prev => [...prev, submissionId]);
      setFeedbacks(prev => ({ ...prev, [submissionId]: '' }));
      await Promise.all([fetchGivenFeedbacks(), fetchAllSubmissions()]);
    } catch (err: any) {
      logger.error('피드백 제출 실패:', err);
      alert(err.response?.data?.message || '오류 발생');
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
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        counts={counts}
      />

      {(viewMode === 'all' || viewMode === 'written') && (
        <MyFeedbacks
          feedbacks={filteredData.givenFeedbacks}
          visibleCount={visibleMyFeedbacks}
          onLoadMore={() => setVisibleMyFeedbacks(prev => prev + 3)}
          totalCount={filteredData.givenFeedbacks.length}
        />
      )}

      {(viewMode === 'all' || viewMode === 'available') && (
        <FeedbackList
          submissions={filteredData.submissions}
          feedbacks={feedbacks}
          expanded={expanded}
          submittedIds={submittedIds}
          onFeedbackChange={(id, value) => setFeedbacks(prev => ({ ...prev, [id]: value }))}
          onSubmitFeedback={submitFeedback}
          onToggleExpand={id => setExpanded(expanded === id ? null : id)}
        />
      )}

      <ScrollToTop />
    </div>
  );
};

export default FeedbackCamp;
