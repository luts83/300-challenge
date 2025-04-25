// src/pages/FeedbackCamp.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import FilterSection from '../components/FilterSection';
import { logger } from '../utils/logger';
import ScrollToTop from '../components/ScrollToTop';

interface Submission {
  _id: string;
  title: string;
  text: string;
  user: { uid: string; email: string; displayName?: string };
  feedbackCount: number;
  hasGivenFeedback: boolean;
  createdAt?: string;
  mode: 'mode_300' | 'mode_1000';
}

interface Feedback {
  _id: string;
  content: string;
  submissionText?: string;
  createdAt: string;
  mode?: 'mode_300' | 'mode_1000';
  submissionAuthor?: { uid: string; email: string; displayName?: string };
  submissionCreatedAt?: string;
}

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
  const [sortBy, setSortBy] = useState<'date' | 'feedback'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [todaySummary, setTodaySummary] = useState<{ mode_300: number; mode_1000: number }>({
    mode_300: 0,
    mode_1000: 0,
  });

  const [todaySubmissionModes, setTodaySubmissionModes] = useState<Set<'mode_300' | 'mode_1000'>>(
    new Set()
  );

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

  const availableSubmissions = allSubmissions
    .filter(item => !item.hasGivenFeedback)
    .filter(item => {
      const availableModes = getAvailableFeedbackModes(todaySubmissionModes);
      return availableModes.has(item.mode);
    })
    .filter(item => {
      if (activeTab === 'all') return true;
      return item.mode === activeTab;
    })
    .filter(
      item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          : new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
      } else {
        return sortOrder === 'desc'
          ? (b.feedbackCount || 0) - (a.feedbackCount || 0)
          : (a.feedbackCount || 0) - (b.feedbackCount || 0);
      }
    });

  // 수정된 fetchGivenFeedbacks
  const fetchGivenFeedbacks = async () => {
    if (!user) return;
    try {
      const modeParam = activeTab === 'all' ? '' : `&mode=${encodeURIComponent(activeTab)}`;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}?page=${page}&limit=10${modeParam}`
      );
      setGivenFeedbacks(res.data.feedbacks);
      setTotalFeedbacks(res.data.total);
      setTodaySummary(res.data.todaySummary); // ✅ 요약 저장
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

      // 오늘 날짜의 글만 필터링
      const today = new Date().toISOString().slice(0, 10);
      const todaySubmissions = submissions.filter((sub: any) => sub.submissionDate === today);

      setHasMySubmission(submissions.length > 0);

      // 오늘 작성한 글의 모드들을 저장
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

  // 로그인 체크를 가장 먼저 수행
  if (!user) return <p className="msg-auth">로그인이 필요합니다.</p>;

  // 그 다음 로딩 상태와 에러 체크
  if (loading) return <p className="msg-auth">로딩 중...</p>;
  if (error) return <p className="msg-error">에러: {error}</p>;

  // 글 작성 여부 체크
  if (!hasMySubmission) {
    return <p className="msg-submit-note">✍ 먼저 글을 작성해야 피드백 미션을 진행할 수 있어요!</p>;
  }

  // 안내 메시지 생성 함수 추가
  const getFeedbackGuidanceMessage = (
    availableCount: number,
    availableModes: Set<'mode_300' | 'mode_1000'>,
    isCrossEnabled: boolean
  ) => {
    const modeMessages = Array.from(availableModes).map(mode => (
      <span
        key={mode}
        className={`inline-block mx-1 px-2 py-0.5 rounded-full ${
          mode === 'mode_300' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
        }`}
      >
        {mode === 'mode_300' ? '300자' : '1000자'} 글쓰기
      </span>
    ));

    return (
      <div>
        <p className="text-base text-gray-700 mb-2">
          ✍ 아래 {availableCount}개의 글 중 원하시는 글에 피드백을 남겨보세요. 피드백 3개를
          완료하면 내가 받은 피드백을 확인할 수 있어요!
        </p>
        <p className="text-sm text-gray-600">
          {isCrossEnabled ? (
            <>
              현재 작성 가능한 피드백: {modeMessages}
              <br />
              <span className="text-xs text-blue-600 mt-1">
                🔄 교차 피드백이 허용되어 있어 다른 모드의 글에도 피드백을 남길 수 있습니다.
              </span>
            </>
          ) : (
            <>오늘 작성한 {modeMessages} 모드의 글에만 피드백을 남길 수 있습니다.</>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl sm:text-xl font-bold mb-6 text-center">🤝 피드백 미션</h1>
      <div className="mb-6 p-3 bg-blue-100/80 text-blue-800 rounded-lg text-base text-center font-medium">
        {availableSubmissions.length > 0 ? (
          getFeedbackGuidanceMessage(
            availableSubmissions.length,
            getAvailableFeedbackModes(todaySubmissionModes),
            CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED
          )
        ) : (
          <p className="text-base text-gray-500 mb-0 text-center">
            {todaySubmissionModes.size > 0
              ? '📭 아직 피드백할 수 있는 글이 없습니다.'
              : '✍ 먼저 글을 작성해야 피드백을 남길 수 있습니다.'}
          </p>
        )}
      </div>

      {/* 필터 & 검색창 */}
      <FilterSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        availableModes={getAvailableFeedbackModes(todaySubmissionModes)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showSortOptions={true}
        customSortOptions={[
          { value: 'date', label: '날짜순' },
          { value: 'feedback', label: '피드백순' },
        ]}
      />

      {/* 내가 작성한 피드백 */}
      <div className="mt-8">
        <h2 className="text-xl sm:text-lg font-semibold mb-4">✍ 내가 작성한 피드백</h2>
        <div className="mb-6 text-sm text-gray-600 text-center">
          <p>오늘 작성한 피드백</p>
          <p>
            🧩 300자: <span className="font-bold text-blue-700">{todaySummary.mode_300}</span>개 /
            📘 1000자: <span className="font-bold text-green-700">{todaySummary.mode_1000}</span>개
          </p>
        </div>
        {givenFeedbacks.length === 0 ? (
          <p className="text-base text-gray-500 text-center">아직 작성한 피드백이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {givenFeedbacks.map(item => (
                <li
                  key={item._id}
                  className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setExpanded(prev => (prev === item._id ? null : item._id))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-medium text-gray-900">
                        💬 {item.content.slice(0, 60)}...
                      </p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span>{new Date(item.createdAt).toLocaleString('ko-KR')}</span>
                        {item.mode && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.mode === 'mode_300'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {item.mode === 'mode_300' ? '300자' : '1000자'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {expanded === item._id && (
                    <div className="mt-3 space-y-3">
                      <p className="text-base text-gray-700 whitespace-pre-wrap">{item.content}</p>

                      {item.submissionText && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-base font-medium text-blue-600 mb-2">📝 원글</p>
                          <p className="text-base text-gray-700 whitespace-pre-wrap">
                            {item.submissionText}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            작성자:{' '}
                            {item.submissionAuthor?.displayName || item.submissionAuthor?.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            작성일:{' '}
                            {item.submissionCreatedAt
                              ? new Date(item.submissionCreatedAt).toLocaleDateString('ko-KR')
                              : '작성일 정보 없음'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex justify-center mt-4 gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ◀ 이전
              </button>
              <span className="px-3 py-1.5 text-base text-gray-600">{page}</span>
              <button
                onClick={() => {
                  const maxPage = Math.ceil(totalFeedbacks / 10);
                  if (page < maxPage) setPage(page + 1);
                }}
                disabled={page >= Math.ceil(totalFeedbacks / 10)}
                className="px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-base min-h-[36px] bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 ▶
              </button>
            </div>
          </>
        )}
      </div>

      {/* 피드백 할 글 */}
      <div className="mt-8">
        <h2 className="text-xl sm:text-lg font-semibold mb-4">📝 피드백 대상 글</h2>
        {availableSubmissions.length === 0 ? (
          <p className="text-base text-black-500 text-center">
            📭 아직 피드백할 수 있는 글이 없어요!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {availableSubmissions.slice(0, visibleCount).map(submission => (
                <div key={submission._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* 헤더 섹션 - 항상 표시 */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === submission._id ? null : submission._id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        {/* 제목 */}
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {submission.title}
                        </h3>
                        {/* 메타 정보 */}
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span className="flex items-center">
                            👤 {submission.user.displayName || '익명'}
                          </span>
                          <span>
                            📅 {new Date(submission.createdAt || '').toLocaleDateString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              submission.mode === 'mode_300'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {submission.mode === 'mode_300' ? '300자' : '1000자'}
                          </span>
                          <span className="flex items-center">💬 {submission.feedbackCount}</span>
                        </div>
                      </div>
                      {/* 확장/축소 아이콘 */}
                      <span className="text-gray-400">
                        {expanded === submission._id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* 본문 및 피드백 섹션 - 확장 시에만 표시 */}
                  {expanded === submission._id && (
                    <div className="border-t border-gray-100 p-4">
                      {/* 본문 */}
                      <div className="mb-4 whitespace-pre-wrap text-gray-700">
                        {submission.text}
                      </div>

                      {/* 피드백 입력 */}
                      <div className="space-y-3">
                        <textarea
                          value={feedbacks[submission._id] || ''}
                          onChange={e =>
                            setFeedbacks(prev => ({
                              ...prev,
                              [submission._id]: e.target.value,
                            }))
                          }
                          placeholder="피드백을 작성해주세요..."
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={4}
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            최소 {CONFIG.FEEDBACK.MIN_LENGTH}자 이상 작성해주세요.
                          </span>
                          <button
                            onClick={e => submitFeedback(submission._id, e)}
                            disabled={
                              !feedbacks[submission._id] ||
                              feedbacks[submission._id].length < CONFIG.FEEDBACK.MIN_LENGTH
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            피드백 제출
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {availableSubmissions.length > visibleCount && (
              <button
                className="w-full mt-4 py-2 sm:py-3 bg-gray-100/80 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base"
                onClick={() => setVisibleCount(prev => prev + 3)}
              >
                더보기
              </button>
            )}
          </>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
};

export default FeedbackCamp;
