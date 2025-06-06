// client/src/pages/Write1000.tsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';
import Layout from '../components/Layout';
import ScrollToTop from '../components/ScrollToTop';

const AUTOSAVE_INTERVAL = 60_000; // 10초
const INACTIVITY_THRESHOLD = 600_000; // 10분 (600초)

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  parts.push(`${secs}초`);
  return parts.join(' ');
};

// API 응답 타입 정의
interface ApiError {
  response?: {
    data?: {
      message: string;
    };
  };
  message: string;
}

// 에러 처리 헬퍼 함수
const handleApiError = (error: unknown, defaultMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};

// API 호출 시 캐시 방지 헤더 추가
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
});

// 타입 정의 추가
interface Draft {
  uid: string;
  title: string;
  text: string;
  sessionCount: number;
  totalDuration: number;
  resetCount: number;
  status: 'active' | 'submitted' | 'reset';
  lastInputTime?: number;
  lastSavedAt?: number;
  submittedAt?: Date;
  resetHistory?: Array<{
    resetAt: Date;
    sessionCount: number;
    duration: number;
  }>;
}

// utils: 상태 초기화
const resetWritingState = (
  setText,
  setTitle,
  setSessionCount,
  setTotalDuration,
  setStartTime,
  setDurationNow,
  setIsStarted,
  setLastInputTime,
  setLastSavedAt,
  setHasWrittenThisSession,
  setResetCount?
) => {
  setText('');
  setTitle('');
  setSessionCount(0);
  setTotalDuration(0);
  setStartTime(null);
  setDurationNow(0);
  setIsStarted(false);
  setLastInputTime(null);
  setLastSavedAt(null);
  setHasWrittenThisSession(false);
  if (setResetCount) setResetCount(0);
};

// utils: 로컬 스토리지 초기화
const clearLocalDraft = () => {
  localStorage.setItem('write1000_submitted', 'true');
  localStorage.removeItem('write1000_draft');
  localStorage.removeItem('write1000_session');
};

const Write1000 = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [sessionCount, setSessionCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [durationNow, setDurationNow] = useState(0);
  const [dailyTopic, setDailyTopic] = useState('');
  const [tokens, setTokens] = useState<number | null>(null);
  const [bestRecord, setBestRecord] = useState<{ sessionCount: number; duration: number } | null>(
    null
  );
  const [bestRecordError, setBestRecordError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState<number>(0);
  const [isTokensLoading, setIsTokensLoading] = useState(true);
  const [lastInputTime, setLastInputTime] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isPageReentered, setIsPageReentered] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'complete'>(
    'idle'
  );
  const [submissionProgress, setSubmissionProgress] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_LENGTH = CONFIG.SUBMISSION.MODE_1000.MIN_LENGTH;
  const MAX_LENGTH = CONFIG.SUBMISSION.MODE_1000.MAX_LENGTH;
  const isTokenDepleted = tokens !== null && tokens <= 0;
  const [hasWrittenThisSession, setHasWrittenThisSession] = useState(false);
  const [subStep, setSubStep] = useState<'loading' | 'evaluating'>('loading');
  const submissionInProgress = useRef(false);

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

  const fetchDraft = async () => {
    if (!user) return;

    try {
      const res = await axiosInstance.get(`/api/drafts/${user.uid}`);
      const draft: Draft = res.data;

      if (!draft || draft.status !== 'active') {
        setText('');
        setTitle('');
        setSessionCount(0);
        setTotalDuration(0);
        setIsStarted(false);
        setResetCount(0);
        return;
      }

      setTitle(draft.title ?? '');
      setText(draft.text ?? '');

      setSessionCount(Number(draft.sessionCount) || 0);
      setTotalDuration(Number(draft.totalDuration) || 0);
      setResetCount(Number(draft.resetCount) || 0);
      setLastSavedAt(draft.lastSavedAt || null);
      setIsStarted(false);
      setIsPageReentered(true);
    } catch (err) {
      console.error('📱 fetchDraft 에러:', err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        localStorage.removeItem('write1000_draft');
        localStorage.removeItem('write1000_session');
        setText('');
        setTitle('');
        setSessionCount(0);
        setTotalDuration(0);
        setIsStarted(false);
        setIsPageReentered(false);
        return;
      }
      logger.error('📭 초안 불러오기 실패:', err);
      setIsPageReentered(true);
    }
  };

  const saveDraft = async (showMessage = false) => {
    if (!user) {
      if (showMessage) {
        setSaveMessage('⚠️ 로그인이 필요합니다.');
        setTimeout(() => setSaveMessage(null), 3000);
      }
      return;
    }

    const isSubmitted = localStorage.getItem('write1000_submitted');
    if (isSubmitted) return;

    if (text.trim().length === 0 && title.trim().length === 0) return;

    const now = Date.now();
    const currentDuration = startTime ? Math.floor((now - startTime) / 1000) : 0;
    const updatedTotalDuration = totalDuration + currentDuration;

    try {
      await axiosInstance.post('/api/drafts/save', {
        uid: user.uid,
        title: title || '',
        text: text || '',
        sessionCount,
        totalDuration: updatedTotalDuration,
        resetCount,
        lastInputTime: now,
        lastSavedAt: now,
      });

      if (showMessage) {
        setSaveMessage('✨ 초안이 저장되었습니다!');
        setTimeout(() => setSaveMessage(null), 3000);
      }

      // ⭐ 여기서 타이머를 멈추거나 세션 리셋하는 행동을 하면 절대 안 됨.
      // 즉, startTime과 hasWrittenThisSession은 건드리지 말 것.
    } catch (err) {
      logger.error('❌ 초안 저장 실패:', err);
      if (showMessage) {
        setSaveMessage('❌ 초안 저장에 실패했습니다.');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    }
  };

  const deleteDraft = async () => {
    if (!user) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/drafts/${user.uid}`);
      // localStorage의 모든 관련 데이터 삭제
      clearLocalDraft();
      resetWritingState(
        setText,
        setTitle,
        setSessionCount,
        setTotalDuration,
        setStartTime,
        setDurationNow,
        setIsStarted,
        setLastInputTime,
        setLastSavedAt,
        setHasWrittenThisSession,
        setResetCount
      );

      // 자동저장 중단
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    } catch (err) {
      logger.error('❌ 초안 삭제 실패:', err);
    }
  };

  const updateTokens = async (change: number) => {
    if (!user) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/tokens/update`, {
        uid: user.uid,
        change,
      });
      setTokens(res.data.tokens);
      setIsTokensLoading(false);
    } catch (err) {
      logger.error('❌ 토큰 업데이트 실패:', err);
      setTokens(0);
      setIsTokensLoading(false);
    }
  };

  const resetDraft = async () => {
    if (text.trim().length === 0 && title.trim().length === 0) {
      return alert('작성한 글이 없어요! 초기화할 내용이 없습니다.');
    }

    if (resetCount >= CONFIG.SUBMISSION.RESET_LIMIT_1000) {
      return alert('초기화 가능 횟수를 모두 사용했습니다.');
    }

    if (!window.confirm(`⚠️ 모든 기록이 초기화됩니다. 정말 초기화하시겠습니까?`)) return;

    try {
      // POST /reset 호출로 변경
      // 정답 — ✅ resetCount 증가 O
      const response = await axiosInstance.post(`/api/drafts/${user?.uid}/reset`);
      const newDraft = response.data.draft;

      resetWritingState(
        setText,
        setTitle,
        setSessionCount,
        setTotalDuration,
        setStartTime,
        setDurationNow,
        setIsStarted,
        setLastInputTime,
        setLastSavedAt,
        setHasWrittenThisSession
      );

      // 서버에서 받은 draft의 resetCount로 상태 갱신
      setResetCount(newDraft.resetCount);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }

      localStorage.removeItem('write1000_draft');
      localStorage.removeItem('write1000_session');

      alert('초기화되었습니다! 다시 글쓰기를 시작할 수 있습니다.');
    } catch (error) {
      const errorMessage = handleApiError(error, '초기화 중 오류가 발생했습니다');
      logger.error('초기화 실패:', errorMessage);
      alert(`초기화 실패: ${errorMessage}`);
    }
  };

  const handleSubmitComplete = (res, score, feedback) => {
    setSubmissionState('complete');
    setSubmissionProgress('✨ 글 작성이 완료되었습니다!');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    }

    // 메시지 전환을 부드럽게 하기 위해 setTimeout을 사용하여 단계별로 메시지를 표시
    setTimeout(() => {
      setSubmissionProgress('🔑 1000자 글쓰기를 완료하여 황금열쇠를 받았습니다!');
    }, 1000);

    setTimeout(() => {
      const message = [
        '✨ 글 작성이 완료되었습니다!\n',
        score ? `🎯 AI 평가 점수: ${score}점` : '',
        feedback ? `💬 AI 피드백: ${feedback}\n` : '',
        '🔑 1000자 글쓰기를 완료하여 황금열쇠를 받았습니다!\n',
        '\n📝 다음은 어떤 활동을 해보시겠어요?',
        '1. 피드백 미션에서 다른 사람의 글에 피드백 남기기',
        '2. 내가 작성한 글 확인하기',
        '3. 새로운 글 작성하기',
        `\n남은 토큰: ${res.data.data.tokens}개\n`,
        '피드백 미션로 이동하시겠습니까?',
        '(확인: 피드백 미션로 이동, 취소: 내 제출 목록으로 이동)',
      ]
        .filter(Boolean)
        .join('\n');

      const userChoice = window.confirm(message);

      if (userChoice) {
        navigate('/feedback-camp');
      } else {
        navigate('/my');
      }
    }, 3000);
  };

  const submitFinal = async () => {
    if (!user) return;

    // 현재 세션의 시간 계산
    const now = Date.now();
    const currentSessionDuration = startTime ? Math.floor((now - startTime) / 1000) : 0;

    // 총 소요 시간 = 이전까지의 누적 시간 + 현재 세션 시간
    const finalDuration = totalDuration + currentSessionDuration;

    if (
      !window.confirm(
        `정말 제출하시겠습니까?\n\n` +
          `제목: ${title}\n` +
          `작성한 글자 수: ${text.length}자\n` +
          `총 세션 수: ${sessionCount}회\n` +
          `소요 시간: ${formatDuration(finalDuration)}\n\n` +
          `제출 후에는 수정이 불가능합니다.`
      )
    ) {
      return;
    }

    // 제출 시작
    submissionInProgress.current = true;
    setSubmissionState('submitting');
    setSubStep('loading'); // 초기엔 로딩 스피너
    setSubmissionProgress('글을 제출하고 있습니다...');

    setTimeout(() => {
      setSubStep('evaluating');
      setSubmissionProgress('AI가 글을 읽고 평가하고 있어요... ✨');
    }, 1200); // 1.2초 뒤 평가 상태로 전환

    try {
      // 최종 시간 상태 업데이트
      setTotalDuration(finalDuration);

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, {
        title,
        text,
        topic: dailyTopic || null,
        mode: 'mode_1000',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
        sessionCount,
        duration: finalDuration,
      });

      let { score, feedback } = res.data.data;
      if (feedback && typeof feedback === 'object') {
        feedback = Object.entries(feedback)
          .map(([key, value]) => `• ${key}`)
          .join('\n');
      }

      // 2. draft 완료 처리
      try {
        const completeRes = await axiosInstance.post(`/api/drafts/${user.uid}/complete`);
        const newDraft = completeRes.data.draft;

        clearLocalDraft();
        resetWritingState(
          setText,
          setTitle,
          setSessionCount,
          setTotalDuration,
          setStartTime,
          setDurationNow,
          setIsStarted,
          setLastInputTime,
          setLastSavedAt,
          setHasWrittenThisSession,
          setResetCount
        );
      } catch (completeError) {
        logger.error('Draft 완료 처리 실패:', completeError);
        // 실패해도 계속 진행
      }

      // 3. 제출 완료 처리
      handleSubmitComplete(res, score, feedback);
    } catch (error) {
      const errorMessage = error.response?.data?.message || '알 수 없는 오류가 발생했습니다.';
      logger.error('제출 실패:', errorMessage);
      setSubmissionState('idle');
      setSubmissionProgress('');
      alert(`제출 실패: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTopic = async () => {
    if (!CONFIG.TOPIC.SHOW_ON_HOME_1000) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/topic/today?mode=mode_1000`);
      setDailyTopic(res.data.topic);
    } catch (err) {
      logger.error('주제 불러오기 실패:', err);
    }
  };

  const fetchTokens = async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?mode=mode_1000`
      );
      const tokenValue = res.data.tokens_1000;

      setTokens(typeof tokenValue === 'number' ? tokenValue : 0);
      setIsTokensLoading(false);
    } catch (err) {
      logger.error('토큰 불러오기 실패:', err);
      setTokens(0);
      setIsTokensLoading(false);
    }
  };

  const fetchBestRecord = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/records/best?mode=mode_1000`
      );
      setBestRecord(res.data);
      setBestRecordError(null);
    } catch (err) {
      setBestRecordError('최고 기록을 불러오지 못했습니다.');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    const now = Date.now();
    setLastInputTime(now);

    localStorage.removeItem('write1000_submitted');

    if (!startTime) {
      setStartTime(now);
    }

    if (!hasWrittenThisSession) {
      setSessionCount(prev => prev + 1);
      setHasWrittenThisSession(true);
    }
  };

  // 제목 변경 핸들러 추가
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);

    // 제목 입력 시에도 lastInputTime 업데이트
    const now = Date.now();
    setLastInputTime(now);

    // 타이머 시작 (아직 시작하지 않은 경우)
    if (!startTime) {
      setStartTime(now);
      setIsStarted(true);
    }
  };

  // 최초 시작 감지 후 startTime 보장용 useEffect

  useEffect(() => {
    if (!startTime) return;

    timerRef.current = setInterval(() => {
      setDurationNow(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  useEffect(() => {
    const isSubmitted = localStorage.getItem('write1000_submitted') === 'true';

    if (!isSubmitted) {
      fetchDraft();
    }
    fetchTopic();
    fetchTokens();
    fetchBestRecord();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveRef.current) clearInterval(autosaveRef.current);
      if (inactivityRef.current) clearInterval(inactivityRef.current);

      // 제출 완료 상태가 아니면 저장
      if (!isSubmitted) {
        saveDraft();
      }
    };
  }, [user]);

  useEffect(() => {
    const isSubmitted = localStorage.getItem('write1000_submitted') === 'true';

    if (isSubmitted || isTokenDepleted || !user) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
      return;
    }

    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
    }

    autosaveRef.current = setInterval(() => {
      if (text.trim().length > 0) {
        saveDraft();
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [text, isTokenDepleted, user]);

  useEffect(() => {
    if (!lastInputTime) return;

    inactivityRef.current = setInterval(async () => {
      if (Date.now() - lastInputTime >= INACTIVITY_THRESHOLD) {
        await saveDraft();
        alert('장시간 비활동으로 저장 후 메인 페이지로 이동합니다!');
        navigate('/');
      }
    }, 1000);

    return () => {
      if (inactivityRef.current) clearInterval(inactivityRef.current);
    };
  }, [lastInputTime]);

  // 컴포넌트 마운트 시 초기화 상태 확인
  useEffect(() => {
    const checkResetStatus = async () => {
      if (resetCount > 0 && !isPageReentered) {
        // isPageReentered 체크 추가
        setText('');
        setSessionCount(0);
        setTotalDuration(0);
        setStartTime(null);
        setDurationNow(0);
      }
    };

    checkResetStatus();
  }, [resetCount, isPageReentered]); // isPageReentered 의존성 추가

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-300">
          ✍️ 1000자 글쓰기
        </h1>

        {/* 토큰 현황 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between dark:bg-gray-800">
          <span className="text-blue-800 font-medium dark:text-gray-300">오늘의 토큰</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎫</span>
            <span className="text-xl font-bold text-blue-600">{tokens ?? 0}</span>
          </div>
        </div>

        {/* 제목과 주제 영역 */}
        <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-md p-4 mb-6">
          {/* 오늘의 주제 */}
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-medium text-gray-800 mb-2 dark:text-gray-300">
              📝 오늘의 주제
            </h2>
            <p className="text-sm md:text-base text-gray-700 bg-blue-50 p-3 rounded-lg dark:bg-gray-500 dark:text-gray-300">
              {CONFIG.TOPIC.SHOW_ON_HOME_1000
                ? dailyTopic || '주제를 불러오는 중...'
                : '자유 주제입니다. 마음 가는 대로 글을 써보세요.'}
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
                onChange={handleTitleChange}
                placeholder="이 글의 제목을 입력해주세요"
                maxLength={80}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg placeholder:text-base dark:bg-gray-600 dark:text-gray-300"
              />
              <span className="absolute right-3 bottom-3 text-xs md:text-sm text-gray-500">
                {title.length}/80
              </span>
            </div>
          </div>
        </div>

        {/* 글쓰기 영역 */}
        <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-md p-4">
          {/* 세션 정보 */}
          <div className="mb-4 flex justify-between text-xs md:text-sm text-gray-600 dark:text-gray-300">
            <span>🧭 세션 {sessionCount}회차</span>
            <span>⏱ 누적 시간: {formatDuration(totalDuration + durationNow)}</span>
          </div>

          <div className="relative mb-4">
            <textarea
              value={text}
              onChange={handleTextChange}
              onFocus={() => console.log('📱 textarea 포커스, 현재 text:', text)}
              placeholder="1000자 이내로 자유롭게 작성해보세요."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base placeholder:text-base dark:bg-gray-600 dark:text-gray-300"
              maxLength={MAX_LENGTH}
              disabled={isTokenDepleted}
            />
            <div className="absolute right-2 bottom-2 text-xs md:text-sm text-gray-500">
              {text.length}/{MAX_LENGTH}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              {isTokenDepleted ? (
                <span className="text-red-600 dark:text-red-400">토큰이 모두 소진되었습니다</span>
              ) : (
                <span>초기화 가능: {CONFIG.SUBMISSION.RESET_LIMIT_1000 - resetCount}회</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <button
                onClick={resetDraft}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
                disabled={
                  isSubmitting ||
                  resetCount >= CONFIG.SUBMISSION.RESET_LIMIT_1000 ||
                  isTokenDepleted
                }
              >
                초기화
              </button>
              <button
                onClick={() => saveDraft(true)}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors border border-blue-300 rounded-lg"
                disabled={isSubmitting || text.trim().length === 0 || isTokenDepleted}
              >
                임시저장
              </button>

              <button
                onClick={submitFinal}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
                disabled={
                  isSubmitting ||
                  isTokenDepleted ||
                  text.trim().length < MIN_LENGTH ||
                  !title.trim()
                }
              >
                {isSubmitting ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-4 text-xs md:text-sm text-gray-800 dark:text-gray-300">
          <p>💡 제목과 내용을 모두 작성한 후 제출할 수 있습니다.</p>
          <p>📝 임시저장된 내용은 자동으로 불러와집니다.</p>
        </div>

        {/* 저장 메시지 */}
        {saveMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
              <div className="text-2xl mb-4">
                {saveMessage.includes('❌') ? '⚠️' : saveMessage.includes('✨') ? '✅' : 'ℹ️'}
              </div>
              <div className="text-lg font-semibold text-gray-800 dark:text-gray-300">
                {saveMessage}
              </div>
            </div>
          </div>
        )}

        {/* AI 평가 결과 */}

        {score !== null && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">📊 AI 평가 결과</p>
              <p className="text-3xl font-bold text-blue-600 mb-2">{score}점</p>
              <p className="text-gray-700">{feedback}</p>
            </div>
          </div>
        )}

        {/* 제출 상태 표시 */}
        {submissionState !== 'idle' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex flex-col items-center">
                {submissionState === 'submitting' && (
                  <div className="flex flex-col items-center space-y-4 mb-4">
                    {subStep === 'loading' && (
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    )}

                    {subStep === 'evaluating' && (
                      <div className="flex flex-col items-center space-y-3">
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <ScrollToTop />
    </Layout>
  );
};

export default Write1000;
