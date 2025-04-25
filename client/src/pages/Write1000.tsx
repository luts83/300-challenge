import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate, useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [submissionState, setSubmissionState] = useState<
    'idle' | 'submitting' | 'evaluating' | 'complete'
  >('idle');
  const [submissionProgress, setSubmissionProgress] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_LENGTH = CONFIG.SUBMISSION.MODE_1000.MIN_LENGTH;
  const MAX_LENGTH = CONFIG.SUBMISSION.MODE_1000.MAX_LENGTH;
  const isTokenDepleted = tokens !== null && tokens <= 0;
  const [hasWrittenThisSession, setHasWrittenThisSession] = useState(false);

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
    if (!user) {
      return;
    }

    try {
      const res = await axiosInstance.get(`/api/drafts/${user.uid}`);

      const draft = res.data;

      // 디버깅을 위한 상세 로깅 추가

      // 초기화 후에는 데이터를 불러오지 않음
      if (draft.resetCount > 0 && !draft.text && !draft.title) {
        setText('');
        setTitle('');
        setSessionCount(0);
        setTotalDuration(0);
        setResetCount(draft.resetCount);
        return;
      }

      // 명시적으로 각 필드를 처리
      setTitle(draft.title ?? ''); // null이나 undefined면 빈 문자열
      setText(draft.text ?? ''); // null이나 undefined면 빈 문자열
      setSessionCount(Number(draft.sessionCount) || 0);
      setTotalDuration(Number(draft.totalDuration) || 0);
      setResetCount(Number(draft.resetCount) || 0);
      setLastSavedAt(draft.lastSavedAt ? Number(draft.lastSavedAt) : null);
      setIsStarted(false);
      setIsPageReentered(true);
    } catch (err) {
      logger.error('📭 초안 불러오기 실패:', err);
      if (err.response) {
        logger.error('서버 응답:', err.response.data);
      }
      setIsPageReentered(true);
    }
  };

  const saveDraft = async () => {
    if (!user) {
      setSaveMessage('⚠️ 로그인이 필요합니다.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (text.trim().length === 0 && title.trim().length === 0) {
      return; // 제목과 내용 모두 비어있을 때는 저장하지 않음
    }

    const currentDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const updatedTotalDuration = totalDuration + currentDuration;

    try {
      const response = await axiosInstance.post('/api/drafts/save', {
        uid: user.uid,
        title: title || '',
        text: text || '',
        sessionCount,
        totalDuration: updatedTotalDuration,
        resetCount,
        lastInputTime: lastInputTime || Date.now(),
        lastSavedAt: Date.now(),
      });

      setTotalDuration(updatedTotalDuration);
      setLastSavedAt(Date.now());
      setSaveMessage('✨ 초안이 자동 저장되었습니다!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      logger.error('❌ 초안 저장 실패:', err);
      if (err.response) {
        logger.error('서버 응답:', err.response.data);
      }
      setSaveMessage('❌ 초안 저장에 실패했습니다.');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const deleteDraft = async () => {
    if (!user) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/drafts/${user.uid}`);
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

    if (
      !window.confirm(
        `⚠️ 작성 중인 글과 제목, 시간이 초기화됩니다.\n초기화는 최대 ${CONFIG.SUBMISSION.RESET_LIMIT_1000}번까지 가능합니다.\n정말 초기화하시겠습니까?`
      )
    )
      return;

    try {
      // 1. 서버의 초안 삭제 및 초기화 횟수 업데이트
      await axiosInstance.delete(`/api/drafts/${user?.uid}`, {
        data: {
          resetCount: resetCount + 1,
        },
      });

      // 2. 클라이언트 상태 초기화
      setText('');
      setTitle('');
      setSessionCount(0);
      setTotalDuration(0);
      setStartTime(null);
      setDurationNow(0);
      setIsStarted(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setLastInputTime(null);
      setLastSavedAt(null);
      setResetCount(prev => prev + 1);
      setHasWrittenThisSession(false);

      // 3. 로컬 스토리지도 초기화
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

    setTimeout(() => {
      const message = [
        '✨ 글 작성이 완료되었습니다!\n',
        score ? `🎯 AI 평가 점수: ${score}점` : '',
        feedback ? `💬 AI 피드백: ${feedback}\n` : '',
        '\n📝 다음은 어떤 활동을 해보시겠어요?',
        '1. 피드백 캠프에서 다른 사람의 글에 피드백 남기기',
        '2. 내가 작성한 글 확인하기',
        '3. 새로운 글 작성하기',
        `\n남은 토큰: ${res.data.data.tokens}개\n`,
        '피드백 캠프로 이동하시겠습니까?',
        '(확인: 피드백 캠프로 이동, 취소: 내 제출 목록으로 이동)',
      ]
        .filter(Boolean)
        .join('\n');

      const userChoice = window.confirm(message);

      if (userChoice) {
        navigate('/feedback-camp');
      } else {
        navigate('/my-submissions');
      }
    }, 3000);
  };

  const submitFinal = async () => {
    if (!user) return;

    // 1. 제출 전 확인
    if (
      !window.confirm(
        `정말 제출하시겠습니까?\n\n` +
          `제목: ${title}\n` +
          `작성한 글자 수: ${text.length}자\n` +
          `총 세션 수: ${sessionCount}회\n` +
          `소요 시간: ${formatDuration(totalDuration)}\n\n` +
          `제출 후에는 수정이 불가능합니다.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionState('submitting');
    setSubmissionProgress('글을 제출하고 있습니다...');

    try {
      const finalDuration = startTime
        ? totalDuration + Math.floor((Date.now() - startTime) / 1000)
        : totalDuration;

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

      let score = null;
      let feedback = null;

      if (CONFIG.AI.ENABLE_1000) {
        setSubmissionState('evaluating');
        setSubmissionProgress('AI가 글을 평가하고 있습니다...');

        try {
          const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
            text,
            topic: dailyTopic || '자유 주제',
            submissionId: res.data.data.submissionId,
            mode: 'mode_1000',
          });

          score = aiRes.data.score;
          feedback = aiRes.data.feedback;
        } catch (aiError) {
          logger.error('AI 평가 중 오류 발생:', aiError);
          score = CONFIG.AI.DEFAULT_SCORE;
          feedback = 'AI 평가에 문제가 발생했습니다. 기본 점수가 부여됩니다.';
        }
      }

      // 초안 삭제
      await axiosInstance.delete(`/api/drafts/${user.uid}`);

      // 상태 초기화
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

      // 제출 완료 처리
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

    // ✅ 타이핑 시작하면 무조건 타이머 시작
    if (!startTime) {
      setStartTime(now);
    }

    // ✅ 세션 카운트는 최초 시작 시 한 번만 증가
    if (!hasWrittenThisSession) {
      setSessionCount(prev => prev + 1);
      setHasWrittenThisSession(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStartTime(now); // 타이핑 시작 시점에 타이머 시작
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
    fetchDraft();
    fetchTopic();
    fetchTokens();
    fetchBestRecord();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveRef.current) clearInterval(autosaveRef.current);
      if (inactivityRef.current) clearInterval(inactivityRef.current);
      saveDraft();
    };
  }, [user]);

  useEffect(() => {
    // 토큰이 소진되었거나 사용자가 없는 경우 자동저장 중단
    if (isTokenDepleted || !user) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
      return;
    }

    // 자동저장 인터벌 설정
    autosaveRef.current = setInterval(() => {
      if (text.trim().length > 0) {
        // 텍스트가 있을 때만 저장
        saveDraft();
      }
    }, AUTOSAVE_INTERVAL);

    // cleanup
    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [text, isTokenDepleted, user]); // 의존성 배열에 isTokenDepleted와 user 추가

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
      if (resetCount > 0) {
        setText('');
        setSessionCount(0);
        setTotalDuration(0);
        setStartTime(null);
        setDurationNow(0);
      }
    };

    checkResetStatus();
  }, [resetCount]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">✍️ 1000자 글쓰기</h1>

      {/* 토큰 현황 */}
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
            {CONFIG.TOPIC.SHOW_ON_HOME_1000
              ? dailyTopic || '주제를 불러오는 중...'
              : '자유 주제입니다. 마음 가는 대로 글을 써보세요.'}
          </p>
        </div>

        {/* 제목 입력 */}
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-800 mb-2">✏️ 제목 작성</h2>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="이 글의 제목을 입력해주세요"
              maxLength={80}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <span className="absolute right-3 bottom-3 text-sm text-gray-500">
              {title.length}/80
            </span>
          </div>
        </div>
      </div>

      {/* 글쓰기 영역 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        {/* 세션 정보 */}
        <div className="mb-4 flex justify-between text-sm text-gray-600">
          <span>🧭 세션 {sessionCount}회차</span>
          <span>⏱ 누적 시간: {formatDuration(totalDuration + durationNow)}</span>
        </div>

        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="1000자 이내로 자유롭게 작성해보세요."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            maxLength={MAX_LENGTH}
            disabled={isTokenDepleted}
          />
          <div className="absolute right-2 bottom-2 text-sm text-gray-500">
            {text.length}/{MAX_LENGTH}
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isTokenDepleted ? (
              <span className="text-red-600">토큰이 모두 소진되었습니다</span>
            ) : (
              <span>초기화 가능: {CONFIG.SUBMISSION.RESET_LIMIT_1000 - resetCount}회</span>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={resetDraft}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={
                isSubmitting || resetCount >= CONFIG.SUBMISSION.RESET_LIMIT_1000 || isTokenDepleted
              }
            >
              초기화
            </button>
            <button
              onClick={saveDraft}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              disabled={isSubmitting || text.trim().length === 0 || isTokenDepleted}
            >
              임시저장
            </button>
            <button
              onClick={submitFinal}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={
                isSubmitting || isTokenDepleted || text.trim().length < MIN_LENGTH || !title.trim()
              }
            >
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 text-sm text-black-600">
        <p>💡 제목과 내용을 모두 작성한 후 제출할 수 있습니다.</p>
        <p>📝 임시저장된 내용은 자동으로 불러와집니다.</p>
      </div>

      {/* 저장 메시지 */}
      {saveMessage && (
        <div
          className={`mt-4 p-3 rounded-lg text-center ${
            saveMessage.includes('❌')
              ? 'bg-red-50 text-red-700'
              : saveMessage.includes('✨')
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50 text-blue-700'
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* AI 평가 결과 */}
      {isEvaluating && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center text-blue-700">
          🤖 AI가 글을 평가하고 있어요...
        </div>
      )}

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
              {submissionState === 'complete' && (
                <>
                  <div className="text-3xl mb-4">✅</div>
                  <p className="text-lg font-medium text-gray-800 text-center mb-4">
                    {submissionProgress}
                  </p>
                  {score !== null && (
                    <div className="w-full bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-xl font-bold text-center text-blue-600 mb-2">
                        🎯 AI 평가 점수: {score}점
                      </p>
                      {feedback && (
                        <p className="text-gray-700 text-center whitespace-pre-wrap">{feedback}</p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">잠시 후 다음 활동 안내가 표시됩니다...</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Write1000;
