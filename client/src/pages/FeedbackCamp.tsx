// src/pages/FeedbackCamp.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

interface Submission {
  _id: string;
  text: string;
  user: { uid: string; email: string; displayName?: string };
  feedbackCount: number;
  hasGivenFeedback: boolean;
  submittedAt?: string;
}

interface Feedback {
  _id: string;
  content: string;
  submissionText?: string;
  createdAt: string;
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

  const fetchGivenFeedbacks = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/given/${user.uid}?page=${page}&limit=10`
      );
      setGivenFeedbacks(res.data.feedbacks);
      setTotalFeedbacks(res.data.total);
    } catch (err) {
      console.error('내가 작성한 피드백 조회 실패:', err);
    }
  };

  const fetchAllSubmissions = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/feedback/all-submissions/${user.uid}`
      );
      setAllSubmissions(res.data);
    } catch (err) {
      console.error('❌ 전체 글 목록 불러오기 실패:', err);
      setError('글 목록을 불러오지 못했습니다.');
    }
  };

  const fetchMySubmissionStatus = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/submit/user/${user.uid}`);
      setHasMySubmission(res.data.length > 0);
    } catch (err) {
      console.error('내 글 존재 여부 확인 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (submissionId: string, e: React.MouseEvent) => {
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
      console.error('피드백 제출 실패:', err);
      alert(err.response?.data?.message || '오류 발생');
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchMySubmissionStatus(), fetchAllSubmissions(), fetchGivenFeedbacks()]);
    }
  }, [user, page]);

  if (!user) return <p className="msg-auth">로그인이 필요합니다.</p>;
  if (loading) return <p className="msg-auth">로딩 중...</p>;
  if (error) return <p className="msg-error">에러: {error}</p>;
  if (!hasMySubmission) {
    return <p className="msg-submit-note">✍ 먼저 글을 작성해야 피드백 미션을 진행할 수 있어요!</p>;
  }

  const availableSubmissions = allSubmissions.filter(item => !item.hasGivenFeedback);

  return (
    <div className="section-container">
      <h1 className="section-title">🤝 글쓰기 캠프: 피드백 미션</h1>

      {availableSubmissions.length > 0 ? (
        <p className="text-gray-700 mb-6 leading-relaxed">
          아래 {availableSubmissions.length}개의 글 중 원하시는 글에 피드백을 남겨보세요. 피드백
          3개를 완료하면 내가 받은 피드백을 확인할 수 있어요!
        </p>
      ) : (
        <p className="text-muted mb-6">📭 아직 피드백할 수 있는 글이 없습니다.</p>
      )}

      {/* 내가 작성한 피드백 */}
      <div className="mt-10">
        <h2 className="sub-section-title">✍ 내가 작성한 피드백</h2>
        {givenFeedbacks.length === 0 ? (
          <p className="text-muted">아직 작성한 피드백이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {givenFeedbacks.map(item => (
                <li
                  key={item._id}
                  className="card-default cursor-pointer"
                  onClick={() => setExpanded(prev => (prev === item._id ? null : item._id))}
                >
                  {/* 제목 (30자 프리뷰) */}
                  <p className="text-title">💬 {item.content.slice(0, 30)}...</p>

                  {/* 펼쳐진 카드 내용 */}
                  {expanded === item._id && (
                    <>
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap">{item.content}</p>
                      {item.submissionText && (
                        <div className="card-bordered mt-4">
                          <p className="font-semibold text-blue-500 mb-1">📝 원글</p>
                          <p className="whitespace-pre-wrap">{item.submissionText}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* 날짜 표시 */}
                  <p className="text-note mt-2">
                    {new Date(item.createdAt).toLocaleString('ko-KR')}
                  </p>

                  {/* 👇 날짜 아래 '더 보기' 표시 */}
                  {item.content.length > 100 && expanded !== item._id && (
                    <p
                      className="text-note-more cursor-pointer hover:underline mt-1"
                      onClick={e => {
                        e.stopPropagation();
                        setExpanded(item._id);
                      }}
                    >
                      더 보기
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex justify-center mt-4 gap-2 text-sm">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                ◀ 이전
              </button>
              <span className="pagination-text">{page}</span>
              <button
                onClick={() => {
                  const maxPage = Math.ceil(totalFeedbacks / 10);
                  if (page < maxPage) setPage(page + 1);
                }}
                disabled={page >= Math.ceil(totalFeedbacks / 10)}
                className="pagination-btn"
              >
                다음 ▶
              </button>
            </div>
          </>
        )}
      </div>

      {/* 피드백 할 글 */}
      <div className="mt-12">
        <h2 className="sub-section-title">📝 피드백 대상 글</h2>
        {availableSubmissions.length === 0 ? (
          <p className="text-center-note">📭 아직 피드백할 수 있는 글이 없어요!</p>
        ) : (
          <ul className="space-y-4">
            {availableSubmissions.slice(0, visibleCount).map(item => (
              <li
                key={item._id}
                className={`${item.feedbackCount > 0 ? 'card-highlight' : 'card-default'}`}
              >
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => setExpanded(prev => (prev === item._id ? null : item._id))}
                >
                  <div className="flex-1">
                    <p className="text-title">📝 {item.text.slice(0, 30)}...</p>
                    <p className="text-note mt-1">
                      작성자: {item.user.displayName || item.user.email}
                    </p>
                  </div>
                  {item.feedbackCount > 0 && (
                    <span className="text-feedback-count">💬 피드백 {item.feedbackCount}개</span>
                  )}
                </div>
                {expanded === item._id && (
                  <div className="mt-2">
                    <div className="text-gray-700 whitespace-pre-wrap text-sm mb-2">
                      {item.text}
                    </div>
                    <p className="text-note mb-2">현재 피드백 수: {item.feedbackCount}</p>
                    <textarea
                      placeholder={`피드백을 입력하세요 (${CONFIG.FEEDBACK.MIN_LENGTH}자 이상)`}
                      className="textarea-feedback"
                      rows={3}
                      value={feedbacks[item._id] || ''}
                      onChange={e => {
                        e.stopPropagation();
                        setFeedbacks(prev => ({
                          ...prev,
                          [item._id]: e.target.value,
                        }));
                      }}
                      disabled={item.hasGivenFeedback || submittedIds.includes(item._id)}
                    />
                    <button
                      onClick={e => submitFeedback(item._id, e)}
                      className="btn-submit"
                      disabled={item.hasGivenFeedback || submittedIds.includes(item._id)}
                    >
                      {item.hasGivenFeedback || submittedIds.includes(item._id)
                        ? '제출 완료'
                        : '제출'}
                    </button>
                  </div>
                )}
                {!expanded && item.text.length > 100 && (
                  <p
                    className="text-note-more cursor-pointer hover:underline mt-2"
                    onClick={() => setExpanded(item._id)}
                  >
                    더 보기
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {availableSubmissions.length > visibleCount && (
          <div className="text-center mt-6">
            <button onClick={() => setVisibleCount(prev => prev + 3)} className="btn-more">
              🔽 더 보기 ({availableSubmissions.length - visibleCount}개 남음)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackCamp;
