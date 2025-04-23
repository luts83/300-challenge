import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [isStarted, setIsStarted] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState<number>(0);
  const [isTokensLoading, setIsTokensLoading] = useState(true);
  const [lastInputTime, setLastInputTime] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isPageReentered, setIsPageReentered] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      console.log('No user found, skipping draft fetch');
      return;
    }

    try {
      console.log('Fetching draft for user:', user.uid);
      const res = await axiosInstance.get(`/api/drafts/${user.uid}`, {
        params: {
          _: new Date().getTime(), // 캐시 방지를 위한 타임스탬프
        },
      });
      console.log('Draft fetch response:', res.data);

      const draft = res.data;

      // 초기화 후에는 데이터를 불러오지 않음
      if (draft.resetCount > 0 && draft.text.trim() === '') {
        console.log('Draft has been reset and is empty, clearing local state');
        setText('');
        setSessionCount(0);
        setTotalDuration(0);
        setResetCount(draft.resetCount);
        return;
      }

      console.log('Setting draft data:', {
        text: draft.text,
        sessionCount: draft.sessionCount,
        totalDuration: draft.totalDuration,
        resetCount: draft.resetCount,
        lastSavedAt: draft.lastSavedAt,
      });

      setText(draft.text || '');
      setSessionCount(draft.sessionCount || 0);
      setTotalDuration(draft.totalDuration || 0);
      setResetCount(draft.resetCount || 0);
      setLastSavedAt(draft.lastSavedAt || null);
      setIsStarted(false);
      setIsPageReentered(true);
    } catch (err) {
      console.error('📭 초안 불러오기 실패:', err);
      if (err.response) {
        console.error('서버 응답:', err.response.data);
      }
      setIsPageReentered(true);
    }
  };

  const saveDraft = async () => {
    if (!user) {
      setSaveMessage('⚠️ 로그인이 필요합니다.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
      setHasWrittenThisSession(false); // 저장 후 다음 세션 카운팅 준비
    }

    if (text.trim().length === 0) {
      return; // 빈 텍스트일 때는 조용히 리턴
    }

    const currentDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const updatedTotalDuration = totalDuration + currentDuration;

    try {
      console.log('Saving draft with data:', {
        uid: user.uid,
        text,
        sessionCount,
        totalDuration: updatedTotalDuration,
        resetCount,
        lastInputTime: lastInputTime || Date.now(),
        lastSavedAt: Date.now(),
      });

      const response = await axiosInstance.post('/api/drafts/save', {
        uid: user.uid,
        text,
        sessionCount,
        totalDuration: updatedTotalDuration,
        resetCount,
        lastInputTime: lastInputTime || Date.now(),
        lastSavedAt: Date.now(),
      });

      console.log('Save response:', response.data);

      setTotalDuration(updatedTotalDuration);
      setStartTime(null);
      setDurationNow(0);
      setIsStarted(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setLastSavedAt(Date.now());
      setSaveMessage('✅ 초안이 자동 저장되었습니다!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('❌ 초안 저장 실패:', err);
      if (err.response) {
        console.error('서버 응답:', err.response.data);
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
      console.error('❌ 초안 삭제 실패:', err);
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
      console.error('❌ 토큰 업데이트 실패:', err);
      setTokens(0);
      setIsTokensLoading(false);
    }
  };

  const resetDraft = async () => {
    if (text.trim().length === 0) {
      return alert('작성한 글이 없어요! 초기화할 내용이 없습니다.');
    }

    if (resetCount >= CONFIG.SUBMISSION.RESET_LIMIT_1000) {
      return alert('초기화 가능 횟수를 모두 사용했습니다.');
    }

    if (
      !window.confirm(
        `⚠️ 작성 중인 글과 시간이 초기화됩니다.\n초기화는 최대 ${CONFIG.SUBMISSION.RESET_LIMIT_1000}번까지 가능합니다.\n정말 초기화하시겠습니까?`
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
      console.error('초기화 실패:', errorMessage);
      alert(`초기화 실패: ${errorMessage}`);
    }
  };

  const submitFinal = async () => {
    if (!user) return;

    if (text.trim().length === 0) {
      return alert('아직 글을 작성하지 않았어요!');
    }

    if (text.trim().length < MIN_LENGTH) {
      return alert(`🚫 최소 ${MIN_LENGTH}자 이상 작성해야 제출할 수 있어요.`);
    }

    // 제출 전 확인 다이얼로그
    if (
      !window.confirm(
        `정말 제출하시겠습니까?\n\n` +
          `- 작성한 글자 수: ${text.length}자\n` +
          `- 총 세션 수: ${sessionCount}회\n` +
          `- 소요 시간: ${formatDuration(totalDuration)}\n\n` +
          `제출 후에는 수정이 불가능합니다.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    const finalDuration = startTime
      ? totalDuration + Math.floor((Date.now() - startTime) / 1000)
      : totalDuration;

    try {
      // 1. 글 제출
      setSaveMessage('📤 글을 제출하는 중...');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, {
        text,
        mode: 'mode_1000',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
        sessionCount,
        duration: finalDuration,
      });

      const submissionId = res.data.submissionId;
      setTokens(res.data.tokens);

      // 2. AI 평가 실행 여부 확인 후 평가 요청
      if (CONFIG.AI.ENABLE_1000 && submissionId) {
        setIsEvaluating(true);
        try {
          const aiRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
            text,
            topic: dailyTopic || '자유 주제',
            submissionId,
            mode: 'mode_1000',
          });

          if (aiRes.data && typeof aiRes.data.score === 'number') {
            setScore(aiRes.data.score);
            setFeedback(aiRes.data.feedback || 'AI 피드백을 불러오지 못했습니다.');
          } else {
            console.error('AI 응답 형식이 올바르지 않음:', aiRes.data);
            setScore(CONFIG.AI.DEFAULT_SCORE);
            setFeedback('AI 평가에 문제가 발생했습니다. 기본 점수가 부여됩니다.');
          }
        } catch (aiError) {
          console.error('❌ AI 평가 중 오류 발생:', aiError);
          setScore(CONFIG.AI.DEFAULT_SCORE);
          setFeedback('AI 평가에 문제가 발생했습니다. 기본 점수가 부여됩니다.');
        } finally {
          setIsEvaluating(false);
        }
      }

      setSaveMessage('✅ 제출 완료! 초안을 정리하는 중...');

      // 3. 초안 삭제
      await axiosInstance.delete(`/api/drafts/${user.uid}`, { data: {} });

      setSaveMessage('✨ 모든 처리가 완료되었습니다!');

      // 4. 상태 초기화
      setText('');
      setSessionCount(0);
      setTotalDuration(0);
      setStartTime(null);
      setDurationNow(0);
      setIsStarted(false);
      setLastInputTime(null);
      setLastSavedAt(null);
      setHasWrittenThisSession(false);

      // 5. 리다이렉션
      setTimeout(() => {
        alert(
          `제출 완료! ✨\n\n` +
            `총 ${sessionCount}회차에 걸쳐\n` +
            `${formatDuration(finalDuration)} 동안 ${text.length}자를 작성했어요!\n\n` +
            `계속해서 도전해보세요 💪`
        );
        navigate('/feedback-camp');
      }, 1000);
    } catch (error) {
      const errorMessage = handleApiError(error, '제출 중 오류가 발생했습니다');
      console.error('제출 실패:', errorMessage);
      setSaveMessage('❌ 제출에 실패했습니다. 다시 시도해주세요.');
      setTimeout(() => setSaveMessage(null), 3000);
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
      console.error('주제 불러오기 실패:', err);
    }
  };

  const fetchTokens = async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?mode=mode_1000`
      );
      const tokenValue = res.data.tokens;
      console.log('Fetched tokens:', tokenValue);
      setTokens(typeof tokenValue === 'number' ? tokenValue : 0);
      setIsTokensLoading(false);
    } catch (err) {
      console.error('토큰 불러오기 실패:', err);
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
      setIsStarted(true);
    }
  };

  // 최초 시작 감지 후 startTime 보장용 useEffect

  useEffect(() => {
    console.log('Timer useEffect triggered', startTime); // 추가
    if (!startTime) return;

    timerRef.current = setInterval(() => {
      setDurationNow(Math.floor((Date.now() - startTime) / 1000));
      // console.log('durationNow updated:', durationNow); // 필요시 추가
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  useEffect(() => {
    console.log('Component mounted'); // 추가
    fetchDraft();
    fetchTopic();
    fetchTokens();
    fetchBestRecord();

    return () => {
      console.log('Component unmounted, saving draft'); // 추가
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
        setIsStarted(false);
        setLastInputTime(null);
        setLastSavedAt(null);
      }
    };

    checkResetStatus();
  }, [resetCount]);

  return (
    <div className="wrapper-full-height">
      <div className="flex flex-col items-center mb-4">
        <h1 className="text-2xl font-bold mb-2">⏱ 1000자 글쓰기</h1>

        {CONFIG.TOPIC.SHOW_ON_HOME_1000 ? (
          <p className="text-center text-gray-700 mb-2">
            오늘의 주제: "{dailyTopic || '불러오는 중...'}"
          </p>
        ) : (
          <p className="text-center text-gray-700 mb-2">
            ✍ 자유 주제입니다. 마음 가는 대로 글을 써보세요.
          </p>
        )}

        {isTokensLoading ? (
          <p className="text-sm text-gray-600 text-center mb-1">토큰 로딩 중...</p>
        ) : (
          <div className="flex flex-col items-center">
            <p
              className={`text-sm text-center mb-1 ${
                tokens === 0 ? 'text-red-600 font-bold' : 'text-gray-600'
              }`}
            >
              남은 토큰: {tokens} / {CONFIG?.TOKEN?.DAILY_LIMIT_1000 || 1}
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

        {isTokenDepleted && (
          <p className="text-sm text-red-500 text-center mb-1">
            토큰이 부족합니다. 토큰을 충전해주세요!
          </p>
        )}

        <p className="text-xs text-gray-500 text-center mb-2">
          초기화 가능 횟수: {CONFIG.SUBMISSION.RESET_LIMIT_1000 - resetCount}회 남음
        </p>

        {bestRecord && (
          <p className="text-sm text-blue-600 text-center mb-1">
            🏆 최고 기록: 세션 {bestRecord.sessionCount}회, 시간{' '}
            {formatDuration(bestRecord.duration)}
          </p>
        )}
        {bestRecordError && (
          <p className="text-sm text-red-500 text-center mb-1">{bestRecordError}</p>
        )}
      </div>

      {saveMessage && (
        <div
          className={`mt-2 p-2 rounded text-center ${
            saveMessage.includes('❌')
              ? 'bg-red-100 text-red-700'
              : saveMessage.includes('✨')
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {saveMessage}
        </div>
      )}

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
              setIsEvaluating(false);
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
        <>
          {isEvaluating && (
            <div className="msg-evaluating">🤖 두구두구... AI가 글을 평가하고 있어요!</div>
          )}

          {score !== null && (
            <div className="ai-feedback-box">
              <p className="text-ai-score">📊 AI 평가 점수: {score}점</p>
              <p className="text-ai-feedback">💬 피드백: {feedback}</p>
            </div>
          )}

          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <div>
              🧭 세션 {sessionCount}회차 / 이번 세션 {formatDuration(durationNow)} / 누적{' '}
              {formatDuration(totalDuration + durationNow)}
            </div>
            <div>
              {text.length} / {MAX_LENGTH}자
            </div>
          </div>

          <textarea
            className="textarea-main"
            maxLength={MAX_LENGTH}
            value={text}
            onChange={handleTextChange}
            placeholder="여기에 1000자 글을 작성해보세요..."
            disabled={isTokenDepleted}
          />

          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              onClick={saveDraft}
              className="btn-primary"
              disabled={isSubmitting || text.trim().length === 0 || isTokenDepleted}
            >
              💾 저장하기
            </button>
            <button
              onClick={submitFinal}
              className="btn-primary"
              disabled={isSubmitting || isTokenDepleted}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  제출 중...
                </span>
              ) : (
                '제출하기'
              )}
            </button>
            <button
              onClick={resetDraft}
              className="btn-secondary"
              disabled={
                isSubmitting || resetCount >= CONFIG.SUBMISSION.RESET_LIMIT_1000 || isTokenDepleted
              }
            >
              🔄 초기화
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Write1000;
