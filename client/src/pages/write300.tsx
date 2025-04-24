import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Timer from '../components/Timer';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';

const Write300 = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [dailyTopic, setDailyTopic] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(CONFIG.TIMER.DURATION_MINUTES * 60); // 초 단위
  const submissionInProgress = useRef(false);
  const [submissionState, setSubmissionState] = useState<
    'idle' | 'submitting' | 'evaluating' | 'complete'
  >('idle');
  const [submissionProgress, setSubmissionProgress] = useState<string>('');

  useEffect(() => {
    // 로딩이 완료되고 user가 없을 때만 리다이렉션
    if (!loading && !user) {
      alert('로그인이 필요합니다.');
      navigate('/login', {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [user, loading]); // loading을 의존성 배열에 추가

  // 글자 수 계산 (공백 포함)
  const getCharCount = (str: string) => {
    return str.length;
  };

  const handleSubmit = async (forceSubmit = false) => {
    if (submissionInProgress.current) return;

    if (!user) return alert('로그인이 필요합니다!');

    // 일반 제출 시에만 글자 수 검증
    if (!forceSubmit) {
      if (!text.trim()) {
        return alert('내용을 입력해주세요.');
      }

      const charCount = getCharCount(text);
      if (charCount < CONFIG.SUBMISSION.MODE_300.MIN_LENGTH) {
        return alert(
          `${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자 이상 입력해주세요. (현재: ${charCount}자)`
        );
      }
    }

    if (CONFIG.TOPIC.SHOW_ON_HOME_300 && !dailyTopic) {
      return alert('주제를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    // 제출 시작
    submissionInProgress.current = true;
    setSubmissionState('submitting');
    setSubmissionProgress('글을 제출하고 있습니다...');
    const finalDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0; // 초 단위

    try {
      const charCount = getCharCount(text);
      const isMinLengthMet = charCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, {
        title,
        text,
        topic: dailyTopic || null,
        mode: 'mode_300',
        duration: finalDuration,
        forceSubmit: forceSubmit,
        isMinLengthMet: isMinLengthMet,
        charCount: charCount,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
      });
      console.log('📦 제출 응답:', res.data);

      const submissionId = res.data.submissionId;

      // AI 평가 시작
      if (CONFIG.AI.ENABLE_300) {
        setSubmissionState('evaluating');
        setSubmissionProgress('AI가 글을 평가하고 있습니다...');

        try {
          const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
            text,
            submissionId,
            topic: dailyTopic || '자유 주제',
            mode: 'mode_300',
          });

          setScore(aiRes.data.score ?? CONFIG.AI.DEFAULT_SCORE);
          setFeedback(aiRes.data.feedback || 'AI 피드백을 불러오지 못했습니다.');
        } catch (aiError: any) {
          console.error('AI 평가 중 오류 발생:', aiError);
          setScore(CONFIG.AI.DEFAULT_SCORE);
          setFeedback('AI 평가에 일시적인 문제가 발생했습니다. 기본 점수가 부여됩니다.');
        }
      }

      setTokens(res.data.tokens);
      setText('');
      setTitle('');
      setSubmitted(true);
      setIsStarted(false);

      // 제출 완료 처리
      setSubmissionState('complete');

      // 완료 메시지와 다음 안내
      setTimeout(() => {
        const message = [
          '✨ 글 작성이 완료되었습니다!',
          '',
          score ? `🎯 AI 평가 점수: ${score}점` : '',
          feedback ? `�� AI 피드백: ${feedback}` : '',
          '',
          '📝 다음은 어떤 활동을 해보시겠어요?',
          '',
          '1. 다른 사람의 글에 피드백 남기기',
          '2. 새로운 글 작성하기 (남은 토큰: ' + res.data.tokens + '개)',
          '3. 내가 작성한 글 확인하기',
        ]
          .filter(Boolean)
          .join('\n');

        alert(message);

        // 토큰이 없는 경우 피드백 캠프로 안내
        if (res.data.tokens === 0) {
          navigate('/feedback-camp');
        }
      }, 500);
    } catch (err: any) {
      console.error('제출 중 오류 발생:', err.response?.data || err.message || err);
      alert('오류가 발생했습니다: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmissionState('idle');
      setSubmissionProgress('');
      submissionInProgress.current = false;
    }
  };

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = CONFIG.TIMER.DURATION_MINUTES * 60 - elapsed;
      setRemainingTime(Math.max(0, remaining));
      setDuration(elapsed);

      if (remaining <= 0) {
        clearInterval(interval);
        console.log('시간 만료: 자동 제출 실행');
        // setTimeout으로 약간의 지연을 주어 상태 업데이트가 완료되도록 함
        setTimeout(() => {
          handleSubmit(true); // 강제 제출
        }, 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

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

  const charCount = getCharCount(text);
  const isMinLengthMet = charCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">✍️ 300자 글쓰기</h1>

      {/* 토큰 현황 추가 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
        <span className="text-blue-800 font-medium">오늘의 토큰</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎫</span>
          <span className="text-xl font-bold text-blue-600">{tokens ?? 0}</span>
        </div>
      </div>

      {/* 제목과 주제 영역 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        {/* 오늘의 주제 */}
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-800 mb-2">📝 오늘의 주제</h2>
          <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
            {dailyTopic || '주제를 불러오는 중...'}
          </p>
        </div>

        {/* 제목 입력 */}
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-800 mb-2">✏️ 제목 작성</h2>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="이 글의 제목을 입력해주세요"
              maxLength={50}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <span className="absolute right-3 bottom-3 text-sm text-gray-500">
              {title.length}/50
            </span>
          </div>
        </div>
      </div>

      {/* 글쓰기 영역 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
              if (!startTime) setStartTime(Date.now()); // 처음 입력 시 타이머 시작
            }}
            placeholder={`300자 이내로 자유롭게 작성해보세요.`}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            maxLength={300}
          />
          <div className="absolute right-2 bottom-2 text-sm text-gray-500">{text.length}/300</div>
        </div>

        {/* 타이머 및 버튼 영역 */}
        <div className="flex justify-between items-center">
          <Timer remainingTime={remainingTime} isActive={isStarted} />
          <div className="space-x-2">
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
                setText('');
                setStartTime(null);
                setRemainingTime(CONFIG.TIMER.DURATION_MINUTES * 60);
              }}
              className={`px-4 py-2 rounded-lg ${
                tokens === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={tokens === 0}
            >
              {tokens === 0 ? '토큰이 필요합니다' : '글쓰기 시작'}
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={!isMinLengthMet || isEvaluating || submitted}
              className={`px-4 py-2 rounded-lg ${
                !isMinLengthMet || isEvaluating || submitted
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              제출하기
            </button>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 text-sm text-black-600">
        <p>💡 제목과 내용을 모두 작성한 후 제출할 수 있습니다.</p>
        <p>⏰ 제한 시간: 5분</p>
      </div>

      {/* 제출 상태 표시 */}
      {submissionState !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              {submissionState === 'submitting' && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
              )}
              {submissionState === 'evaluating' && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="animate-pulse text-3xl">🤖</div>
                  <div className="animate-bounce text-3xl">✨</div>
                </div>
              )}
              {submissionState === 'complete' && <div className="text-3xl mb-4">✅</div>}

              <p className="text-lg font-medium text-gray-800 text-center">{submissionProgress}</p>

              {submissionState === 'evaluating' && (
                <div className="mt-4 text-sm text-gray-600">잠시만 기다려주세요...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Write300;
