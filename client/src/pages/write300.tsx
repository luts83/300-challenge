// client/src/pages/write300.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Timer from '../components/Timer';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

const Write300 = () => {
  const { user } = useUser();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [dailyTopic, setDailyTopic] = useState<string>('');

  const handleSubmit = async () => {
    if (!user) return alert('로그인이 필요합니다!');
    if (!text.trim() || text.length < CONFIG.SUBMISSION.MODE_300.MIN_LENGTH) {
      return alert(`${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자 이상 입력해주세요.`);
    }

    if (CONFIG.TOPIC.SHOW_ON_HOME_300 && !dailyTopic) {
      return alert('주제를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    setIsEvaluating(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, {
        text,
        mode: 'mode_300',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
      });

      if (CONFIG.AI.ENABLE) {
        try {
          const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
            text,
            topic: dailyTopic || '자유 주제',
          });

          // AI 응답이 유효한지 확인
          if (aiRes.data && typeof aiRes.data.score === 'number') {
            setScore(aiRes.data.score);
            setFeedback(aiRes.data.feedback || 'AI 피드백을 불러오지 못했습니다.');
          } else {
            console.error('AI 응답 형식이 올바르지 않습니다:', aiRes.data);
            setScore(CONFIG.AI.DEFAULT_SCORE);
            setFeedback('AI 평가에 일시적인 문제가 발생했습니다. 기본 점수가 부여됩니다.');
          }
        } catch (aiError: any) {
          console.error('AI 평가 중 오류 발생:', aiError);

          // JSON 파싱 에러인 경우
          if (aiError.response?.data && typeof aiError.response.data === 'string') {
            setScore(CONFIG.AI.DEFAULT_SCORE);
            setFeedback('AI 평가에 일시적인 문제가 발생했습니다. 기본 점수가 부여됩니다.');
          } else {
            setScore(CONFIG.AI.DEFAULT_SCORE);
            setFeedback('AI 평가에 일시적인 문제가 발생했습니다. 기본 점수가 부여됩니다.');
          }
        }
      }

      alert('제출 완료!');
      setTokens(res.data.remainingTokens);
      setText('');
      setSubmitted(true);
      setIsStarted(false);
    } catch (err: any) {
      console.error('제출 중 오류 발생:', err.response?.data || err.message || err);
      alert('오류가 발생했습니다: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchTokens = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?mode=mode_300`
        );
        setTokens(res.data.tokens);
      } catch (err) {
        console.error('토큰 불러오기 실패:', err);
      }
    };

    const fetchTopic = async () => {
      if (!CONFIG.TOPIC.SHOW_ON_HOME_300) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/topic/today?mode=mode_300`
        );
        setDailyTopic(res.data.topic);
      } catch (err) {
        console.error('주제 불러오기 실패:', err);
      }
    };

    fetchTokens();
    fetchTopic();
  }, [user]);

  return (
    <div className="wrapper-full-height">
      <div className="flex flex-col items-center flex-none mb-4">
        {CONFIG.TOPIC.SHOW_ON_HOME_300 ? (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">오늘의 주제</h1>
            <p className="mb-4 text-gray-700 text-center">
              "{dailyTopic || '주제를 불러오는 중...'}"
            </p>
          </>
        ) : (
          <p className="home-message">✍ 자유 주제입니다. 마음 가는 대로 글을 써보세요.</p>
        )}

        {tokens !== null && (
          <div className="flex flex-col items-center">
            <p
              className={`text-sm mb-2 text-center ${
                tokens === 0 ? 'text-red-600 font-bold' : 'text-gray-600'
              }`}
            >
              남은 토큰: {tokens} / {CONFIG.TOKEN.DAILY_LIMIT_300}
            </p>
            {tokens === 0 && (
              <div className="text-sm text-red-600 mb-2 text-center">
                <p className="mb-1">⚠️ 토큰이 모두 소진되었습니다.</p>
                <p className="text-xs text-gray-600">
                  토큰은 매일 1개씩 지급되며,
                  <br />
                  월-금 연속으로 글을 쓰면 추가 토큰 1개가 지급됩니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {!isStarted ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => {
              if (tokens === 0) {
                alert(
                  '토큰이 모두 소진되었습니다.\n\n' +
                    '토큰은 매일 1개씩 지급되며,\n' +
                    '월-금 연속으로 글을 쓰면 추가 토큰 1개가 지급됩니다.'
                );
                return;
              }
              setIsStarted(true);
              setSubmitted(false);
              setScore(null);
              setFeedback(null);
            }}
            className={`btn-start ${tokens === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={tokens === 0}
          >
            {tokens === 0 ? '토큰이 필요합니다' : '글쓰기 시작'}
          </button>
          {tokens === 0 && (
            <p className="text-sm text-gray-500 text-center">
              내일 새로운 토큰이 지급됩니다.
              <br />
              또는 월-금 연속으로 글을 쓰면 추가 토큰을 받을 수 있습니다.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          <Timer />
          <div className="text-label">
            {text.length} / {CONFIG.SUBMISSION.MODE_300.MAX_LENGTH}자
          </div>
          <textarea
            maxLength={CONFIG.SUBMISSION.MODE_300.MAX_LENGTH}
            value={text}
            onChange={e => setText(e.target.value)}
            className="textarea-main"
            placeholder={`여기에 글을 써보세요 (최대 ${CONFIG.SUBMISSION.MODE_300.MAX_LENGTH}자)`}
          ></textarea>
          <button
            onClick={handleSubmit}
            className="btn-submit"
            disabled={submitted || isEvaluating}
          >
            {isEvaluating ? 'AI 평가 중...' : submitted ? '제출 완료' : '제출'}
          </button>
        </div>
      )}

      {isEvaluating && (
        <div className="msg-evaluating">🤖 두구두구... AI가 글을 평가하고 있어요!</div>
      )}

      {score !== null && (
        <div className="ai-feedback-box">
          <p className="text-ai-score">📊 AI 평가 점수: {score}점</p>
          <p className="text-ai-feedback">💬 피드백: {feedback}</p>
        </div>
      )}
    </div>
  );
};

export default Write300;
