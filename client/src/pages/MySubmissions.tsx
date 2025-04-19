// src/pages/MySubmissions.tsx
import React, { useEffect, useState, Component, ErrorInfo } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

type Submission = {
  _id: string;
  text: string;
  score: number | null;
  feedback: string;
  submittedAt: string;
};

type FeedbackItem = {
  toSubmissionId: string | null;
  content: string;
  createdAt: string;
  submissionText?: string;
};

type Stats = {
  count: number;
  averageScore: number;
  maxScore: number;
  recentDate: string;
};

// 에러 바운더리 컴포넌트
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('에러 바운더리:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-center mt-20 text-red-500">
          오류가 발생했습니다. 새로고침해 주세요.
        </p>
      );
    }
    return this.props.children;
  }
}

const MySubmissions = () => {
  const { user } = useUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [receivedFeedbackData, setReceivedFeedbackData] = useState<{
    totalWritten: number;
    groupedBySubmission: FeedbackItem[];
  }>({ totalWritten: 0, groupedBySubmission: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(3); // 초기 표시 제출물 수

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        const [subRes, statRes, fbRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/stats/${user.uid}`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/feedback/received/${user.uid}`),
        ]);

        console.log('제출물:', subRes.data);
        console.log('통계:', statRes.data);
        console.log('피드백:', fbRes.data);

        setSubmissions(subRes.data);
        setStats(statRes.data);
        setReceivedFeedbackData(fbRes.data);
      } catch (err: any) {
        console.error('데이터 불러오기 실패:', err);
        setError('데이터를 불러오지 못했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  // 디버깅: receivedFeedbackData 상태 확인
  useEffect(() => {
    console.log('receivedFeedbackData:', receivedFeedbackData);
    console.log(
      '피드백 가능 여부:',
      receivedFeedbackData.totalWritten >= CONFIG.FEEDBACK.REQUIRED_COUNT
    );
    console.log('제출물 수:', submissions.length, '표시 수:', visibleCount);
    console.log(
      'groupedBySubmission 상세:',
      receivedFeedbackData.groupedBySubmission.map((fb) => ({
        toSubmissionId: fb.toSubmissionId,
        content: fb.content,
        createdAt: fb.createdAt,
      }))
    );
    console.log('제출물 IDs:', submissions.map((s) => s._id));
  }, [receivedFeedbackData, submissions, visibleCount]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getFeedbacksForSubmission = (submissionId: string): FeedbackItem[] => {
    return receivedFeedbackData.groupedBySubmission.filter(
      (fb) => fb.toSubmissionId && fb.toSubmissionId.toString() === submissionId.toString()
    );
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  if (!user) {
    return <p className="text-center mt-20 text-gray-600">로그인이 필요합니다.</p>;
  }

  if (loading) {
    return <p className="text-center mt-20 text-gray-600">로딩 중...</p>;
  }

  if (error) {
    return <p className="text-center mt-20 text-red-500">{error}</p>;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-xl mx-auto p-4 mt-6 bp-8">
        <h1 className="text-2xl font-bold mb-6">📝 내가 쓴 글</h1>
        {stats && (
          <div className="bg-gray-100/80 p-4 rounded mb-6">
            <h2 className="font-bold text-lg mb-2">📊 작성한 글 통계</h2>
            <p>총 글 수: {stats.count}</p>
            <p>평균 점수: {stats.averageScore.toFixed(1)}점</p>
            <p>최고 점수: {stats.maxScore}점</p>
            <p>최근 작성일: {new Date(stats.recentDate).toLocaleDateString('ko-KR')}</p>
          </div>
        )}

        <div className="bg-white/80 shadow rounded p-4 mb-6">
          <h2 className="text-lg font-bold mb-2">🗣 받은 피드백 현황</h2>
          <p className="text-sm text-gray-500 mb-2">
            💌 {user.displayName} 님은 {receivedFeedbackData.groupedBySubmission.length}
            개의 피드백을 받으셨어요.
          </p>
          {receivedFeedbackData.totalWritten < CONFIG.FEEDBACK.REQUIRED_COUNT ? (
            <p className="text-sm text-gray-400">
              {CONFIG.FEEDBACK.REQUIRED_COUNT}개 이상 피드백을 작성하면 받은 피드백 내용을
              볼 수 있습니다!
            </p>
          ) : receivedFeedbackData.groupedBySubmission.length === 0 ? (
            <p className="text-sm text-gray-400">아직 피드백을 받지 못했습니다.</p>
          ) : null}
        </div>

        {submissions.length === 0 ? (
          <p className="text-center text-gray-500">아직 작성한 글이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {submissions.slice(0, visibleCount).map((item) => {
                const isExpanded = expandedId === item._id;
                const preview =
                  item.text.length > 100 && !isExpanded
                    ? item.text.slice(0, 100) + '...'
                    : item.text;

                const feedbacksForThis = getFeedbacksForSubmission(item._id);
                const canViewFeedback =
                  receivedFeedbackData.totalWritten >= CONFIG.FEEDBACK.REQUIRED_COUNT;
                const hasFeedback = feedbacksForThis.length > 0;

                return (
                  <li
                    key={item._id}
                    className={`p-4 rounded shadow-lg cursor-pointer transition-all hover:shadow-xl ${
                      hasFeedback ? 'bg-blue-50/90' : 'bg-white/90'
                    }`}
                    onClick={() => toggleExpand(item._id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-800 whitespace-pre-line flex-1">{preview}</p>
                      {hasFeedback && (
                        <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                          💬 피드백 {feedbacksForThis.length}개
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-2">
                        {item.score !== null && (
                          <>
                            <p className="text-sm text-indigo-700">
                              📊 AI 평가 점수: {item.score}점
                            </p>
                            <p className="text-sm text-gray-700 bg-blue-100 p-2 rounded">
                              💬 AI 피드백: {item.feedback || '없음'}
                            </p>
                          </>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          작성일: {new Date(item.submittedAt).toLocaleString('ko-KR')}
                        </p>

                        {hasFeedback ? (
                          <div className="mt-3">
                            <h4 className="text-sm font-semibold mb-1">🧑‍🤝‍🧑 받은 피드백</h4>
                            {canViewFeedback ? (
                              <ul className="space-y-1 text-sm text-gray-700">
                                {feedbacksForThis
                                  .sort(
                                    (a, b) =>
                                      new Date(b.createdAt).getTime() -
                                      new Date(a.createdAt).getTime()
                                  )
                                  .map((fb, idx) => (
                                    <li key={idx}>
                                      💬 {fb.content}{' '}
                                      <span className="text-xs text-gray-500">
                                        ({new Date(fb.createdAt).toLocaleString('ko-KR')})
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-400">
                                {CONFIG.FEEDBACK.REQUIRED_COUNT}개 이상 피드백을 작성하면
                                피드백 내용을 볼 수 있습니다!
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mt-2">
                            아직 피드백을 받지 못했습니다.
                          </p>
                        )}
                      </div>
                    )}

                    {!isExpanded && item.text.length > 100 && (
                      <p className="text-xs text-blue-500 mt-2 hover:underline">더 보기</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {submissions.length > visibleCount && (
              <div className="text-center mt-6">
                <button
                  onClick={handleShowMore}
                  className="text-blue-600 hover:underline"
                >
                  🔽 더 보기 ({submissions.length - visibleCount}개 남음)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MySubmissions;