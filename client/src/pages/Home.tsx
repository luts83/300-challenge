// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Timer from '../components/Timer';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';

const Home = () => {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [dailyTopic, setDailyTopic] = useState<string>('');

  const { user } = useUser();

  const handleSubmit = async () => {
    if (!user) return alert('로그인이 필요합니다!');
    if (!text.trim() || text.length < CONFIG.SUBMISSION.MIN_CHAR_COUNT) {
      return alert(`${CONFIG.SUBMISSION.MIN_CHAR_COUNT}자 이상 입력해주세요.`);
    }

    if (CONFIG.TOPIC.SHOW_ON_HOME && !dailyTopic) {
      return alert('주제를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    setIsEvaluating(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, {
        text,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
      });

      if (CONFIG.AI.ENABLE) {
        const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
          text,
          topic: dailyTopic || '자유 주제',
        });

        setScore(aiRes.data.score ?? CONFIG.AI.DEFAULT_SCORE);
        setFeedback(aiRes.data.feedback || 'AI 피드백을 불러오지 못했습니다.');
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
    const fetchTokens = async () => {
      if (!user) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}`);
        setTokens(res.data.tokens);
      } catch (err) {
        console.error('토큰 불러오기 실패:', err);
      }
    };

    const fetchTopic = async () => {
      if (!CONFIG.TOPIC.SHOW_ON_HOME) return;
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/topic/today`);
        setDailyTopic(res.data.topic);
      } catch (err) {
        console.error('주제 불러오기 실패:', err);
      }
    };

    fetchTokens();
    fetchTopic();
  }, [user]);

  // 디버깅: 텍스트 길이 및 화면 크기 확인
  useEffect(() => {
    console.log('텍스트 길이:', text.length);
    console.log('화면 높이:', window.innerHeight, '화면 폭:', window.innerWidth);
  }, [text]);

  return (
    <div className="h-screen overflow-hidden flex flex-col justify-center max-w-xl mx-auto p-4">
  {/* 주제 및 안내 메시지 */}
  <div className="flex flex-col items-center flex-none mb-4">
    {CONFIG.TOPIC.SHOW_ON_HOME ? (
      <>
        <h1 className="text-2xl font-bold mb-2 text-center">오늘의 주제</h1>
        <p className="mb-4 text-gray-700 text-center">
          "{dailyTopic || '주제를 불러오는 중...'}"
        </p>
      </>
    ) : (
      <p className="text-gray-600 text-center mb-4">
        ✍ 자유 주제입니다. 마음 가는 대로 글을 써보세요.
      </p>
    )}

    {tokens !== null && (
      <p className="text-sm text-gray-600 mb-2 text-center">
        남은 토큰: {tokens} / {CONFIG.TOKEN.DAILY_LIMIT}
      </p>
    )}
  </div>

  {/* 글쓰기 시작 버튼 */}
  {!isStarted ? (
    <div className="flex justify-center flex-none">
      <button
        onClick={() => {
          setIsStarted(true);
          setSubmitted(false);
          setScore(null);
          setFeedback(null);
        }}
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        글쓰기 시작
      </button>
        </div>
      ) : (
        <div className="flex flex-col flex-1">
          <Timer />
          <div className="text-right text-sm text-gray-500 mb-1">
            {text.length} / {CONFIG.SUBMISSION.MAX_CHAR_COUNT}자
          </div>
          <textarea
  maxLength={CONFIG.SUBMISSION.MAX_CHAR_COUNT}
  value={text}
  onChange={(e) => setText(e.target.value)}
  className="w-full h-[calc(100vh-300px)] md:h-96 p-2 border border-gray-300 rounded mb-4 overflow-y-auto bg-white/90 shadow-lg scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 resize-y"
  placeholder={`여기에 글을 써보세요 (최대 ${CONFIG.SUBMISSION.MAX_CHAR_COUNT}자)`}
></textarea>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={submitted || isEvaluating}
          >
            {isEvaluating ? 'AI 평가 중...' : submitted ? '제출 완료' : '제출'}
          </button>
        </div>
      )}

      {/* 평가 중 메시지 및 결과 */}
      {isEvaluating && (
        <div className="flex-none mt-4 text-center animate-pulse text-indigo-600 text-lg">
          🤖 두구두구... AI가 글을 평가하고 있어요!
        </div>
      )}

      {score !== null && (
        <div className="flex-none mt-4 p-4 bg-white/90 rounded shadow-lg w-full">
          <p className="font-bold text-lg text-indigo-700">📊 AI 평가 점수: {score}점</p>
          <p className="text-gray-700 mt-2">💬 피드백: {feedback}</p>
        </div>
      )}
    </div>
  );
};

export default Home;