import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Timer from '../components/Timer';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import Layout from '../components/Layout';
import ScrollToTop from '../components/ScrollToTop';

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
  const [dailyTopic, setDailyTopic] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(CONFIG.TIMER.DURATION_MINUTES * 60); // 초 단위
  const submissionInProgress = useRef(false);
  const [submissionState, setSubmissionState] = useState<
    'idle' | 'submitting' | 'evaluating' | 'complete'
  >('idle');
  const [submissionProgress, setSubmissionProgress] = useState<string>('');
  const [subStep, setSubStep] = useState<'loading' | 'evaluating'>('loading');
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [daysSinceJoin, setDaysSinceJoin] = useState<number | null>(null);
  const [nextRefreshDate, setNextRefreshDate] = useState<string | null>(null);

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

  const handleSubmitComplete = (res: any) => {
    setSubmissionState('complete');

    // 연속 작성 챌린지 성공 여부 확인
    const isStreakCompleted = res.data.data.streak?.completed;
    const streakProgress = res.data.data.streak?.progress || [];
    const allDaysCompleted = streakProgress.every((day: boolean) => day);

    // 모든 날짜가 완료되었을 때만 축하 메시지 표시
    if (isStreakCompleted && allDaysCompleted) {
      setSubmissionProgress('🎉 축하합니다! 이번 주 연속 작성 챌린지를 성공하셨어요!');
    } else {
      setSubmissionProgress('✨ 글 작성이 완료되었습니다!');
    }

    setTimeout(() => {
      const message = [
        isStreakCompleted && allDaysCompleted
          ? '🎉 축하합니다! 이번 주 연속 작성 챌린지를 성공하셨어요!\n황금열쇠 1개가 지급되었습니다! ✨\n'
          : '✨ 글 작성이 완료되었습니다!\n',
        '\n📝 다음은 어떤 활동을 해보시겠어요?',
        '1. 피드백 미션에서 다른 사람의 글에 피드백 남기기',
        '2. 내가 작성한 글 확인하기',
        '3. 새로운 글 작성하기',
        `\n남은 토큰: ${res.data.data.tokens}개`,
        isStreakCompleted && allDaysCompleted ? `황금열쇠: ${res.data.data.goldenKeys}개\n` : '\n',
        '피드백 미션으로 이동하시겠습니까?',
        '(확인: 피드백 미션으로 이동, 취소: 내 제출 목록으로 이동)',
      ]
        .filter(Boolean)
        .join('\n');

      if (window.confirm(message)) {
        navigate('/feedback-camp');
      } else {
        navigate('/my');
      }
    }, 500);
  };

  const handleSubmit = async (forceSubmit = false) => {
    if (submissionInProgress.current) return;

    if (!user) return alert('로그인이 필요합니다!');

    // 👉 제출 시작할 때 타이머 멈추기
    setStartTime(null); // 타이머 중지
    setIsStarted(false); // 시작 상태 해제

    const finalDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // 글자 수 검증
    const charCount = getCharCount(text);
    const isMinLengthMet = charCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

    if (!forceSubmit) {
      if (!text.trim()) {
        return alert('내용을 입력해주세요.');
      }

      if (!isMinLengthMet) {
        return alert(
          `${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자 이상 입력해주세요. (현재: ${charCount}자)`
        );
      }
    } else {
      // 자동 제출 시에도 최소 글자 수 확인
      if (!isMinLengthMet) {
        alert(
          '자동 제출이 불가능합니다. 최소 글자 수를 충족하지 않았습니다.\n메인페이지로 이동합니다.'
        );
        navigate('/');
        return;
      }
    }

    if (CONFIG.TOPIC.SHOW_ON_HOME_300 && !dailyTopic) {
      return alert('주제를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    // 제출 시작
    submissionInProgress.current = true;
    setSubmissionState('submitting');
    setSubStep('loading'); // 초기엔 로딩 스피너
    setSubmissionProgress('글을 제출하고 있습니다...');

    setTimeout(() => {
      setSubStep('evaluating');
      setSubmissionProgress('AI가 글을 읽고 평가하고 있어요... ✨');
    }, 1200); // 1.2초 뒤 평가로 전환

    try {
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

      const submissionId = res.data.data.submissionId;

      setTokens(res.data.data.tokens);
      setText('');
      setTitle('');
      setSubmitted(true);
      setIsStarted(false);

      // 제출 완료 처리
      handleSubmitComplete(res);
    } catch (err: any) {
      logger.error('제출 중 오류 발생:', err.response?.data || err);
      alert('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
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

      // 시간 초과 시 자동 제출
      if (remaining <= 0) {
        clearInterval(interval);
        setStartTime(null); // 👉 시간 초과 시에도 타이머 멈추기
        setIsStarted(false); // 👉 시작 상태 해제

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
        setTokens(res.data.tokens_300);
        setIsWhitelisted(res.data.isWhitelisted ?? null);
        setDaysSinceJoin(res.data.daysSinceJoin ?? null);
        setNextRefreshDate(res.data.nextRefreshDate ?? null);
      } catch (err) {
        logger.error('토큰 불러오기 실패:', err);
        setTokens(0);
        setIsWhitelisted(null);
        setDaysSinceJoin(null);
        setNextRefreshDate(null);
      }
    };

    const fetchTopic = async () => {
      if (!CONFIG.TOPIC.SHOW_ON_HOME_300) return;
      try {
        // 사용자의 시간대 정보 가져오기
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userOffset = new Date().getTimezoneOffset();

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/topic/today?mode=mode_300&timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`
        );
        setDailyTopic(res.data.topic);
      } catch (err) {
        logger.error('주제 불러오기 실패:', err);
      }
    };

    fetchTokens();
    fetchTopic();
  }, [user]);

  const charCount = getCharCount(text);
  const isMinLengthMet = charCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-300">
          ✍️ 300자 글쓰기
        </h1>

        {/* 토큰 현황 추가 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between dark:bg-gray-800">
          <span className="text-blue-800 font-medium dark:text-gray-300">오늘의 토큰</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎫</span>
            <span className="text-xl font-bold text-blue-600">{tokens ?? 0}</span>
          </div>
        </div>

        {/* 제목과 주제 영역 */}
        <div className="bg-white dark:bg-gray-800 text-black dark:text-gray-300 rounded-lg shadow-md p-4 mb-6 dark:bg-gray-800">
          {/* 오늘의 주제 */}
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-medium text-gray-800 mb-2 dark:text-gray-300">
              📝 오늘의 주제
            </h2>
            <p className="text-sm md:text-base text-gray-700 bg-blue-50 p-3 rounded-lg dark:bg-gray-500 dark:text-gray-300">
              {dailyTopic || '주제를 불러오는 중...'}
            </p>
          </div>

          {/* 제목 입력 */}
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-medium text-gray-800 mb-2 dark:text-gray-300">
              ✏️ 제목 작성
            </h2>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="이 글의 제목을 입력해주세요"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg placeholder:text-base dark:bg-gray-600 dark:text-gray-300"
              />
              <span className="absolute right-3 bottom-3 text-xs md:text-sm text-gray-500">
                {title.length}/50
              </span>
            </div>
          </div>
        </div>

        {/* 글쓰기 영역 */}
        <div className="bg-white dark:bg-gray-800 text-black dark:text-gray-300 rounded-lg shadow-md p-4">
          <div className="relative mb-2">
            <textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (!startTime) setStartTime(Date.now()); // 처음 입력 시 타이머 시작
              }}
              placeholder={`300자 이내로 자유롭게 작성해보세요.`}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base placeholder:text-base dark:bg-gray-600 dark:text-gray-300"
              maxLength={300}
              disabled={tokens === 0}
            />
            <div className="absolute right-2 bottom-2 text-xs md:text-sm text-gray-500">
              {text.length}/300
            </div>
          </div>

          {/* 토큰 소진 안내 메시지 */}
          {tokens === 0 && (
            <div className="text-red-600 text-sm mb-2">
              {isWhitelisted || (daysSinceJoin !== null && daysSinceJoin < 7)
                ? '오늘의 토큰이 모두 소진되었습니다. 내일 다시 도전해 주세요!'
                : '이번 주 토큰이 모두 소진되었습니다. 다음 주 월요일에 다시 도전해 주세요!'}
            </div>
          )}

          {/* 타이머 및 버튼 영역 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <Timer
              remainingTime={remainingTime}
              isActive={isStarted}
              mode="300"
              onTimeUp={() => handleSubmit(true)}
            />
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
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
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  tokens === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800'
                }`}
                disabled={tokens === 0}
              >
                {tokens === 0 ? '토큰이 필요합니다' : '글쓰기 시작'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={tokens === 0 || !isMinLengthMet || submitted}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  tokens === 0 || !isMinLengthMet || submitted
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-800 dark:hover:bg-blue-900'
                }`}
              >
                제출하기
              </button>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-2 text-xs md:text-sm text-gray-800 dark:text-gray-300">
          <p>💡 제목과 내용을 모두 작성한 후 제출할 수 있습니다.</p>
          <p>⏰ 제한 시간: 5분</p>
        </div>

        {/* 제출 상태 표시 */}
        {submissionState === 'submitting' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 text-black dark:text-gray-300 rounded-lg p-6 max-w-md w-full mx-4 flex flex-col items-center space-y-6">
              {subStep === 'loading' && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              )}

              {subStep === 'evaluating' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-4xl animate-spin">🤖</div>
                    <div className="text-4xl animate-bounce">✨</div>
                  </div>
                  <p className="text-lg font-medium text-gray-800 text-center dark:text-gray-300">
                    {submissionProgress}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ScrollToTop />
    </Layout>
  );
};

export default Write300;
