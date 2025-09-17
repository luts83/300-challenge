import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Timer from '../components/Timer';
import { useUser } from '../context/UserContext';
import { CONFIG } from '../config';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import Layout from '../components/Layout';
import ScrollToTop from '../components/ScrollToTop';
// 향후 고도화 예정 기능들
// import SmartWritingGuide from '../components/SmartWritingGuide';
// import EndingTemplateGuide from '../components/EndingTemplateGuide';

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

  // 🛡️ 중복 제출 방지 강화
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionHash, setSubmissionHash] = useState<string>('');
  const lastSubmissionRef = useRef<{ title: string; text: string; timestamp: number } | null>(null);

  // 🛡️ 강화된 중복 제출 방지용 상태
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 제출 데이터의 해시값 생성 (중복 감지용)
  const generateSubmissionHash = (title: string, text: string) => {
    const content = `${title.trim()}:${text.trim()}`;
    return btoa(content).slice(0, 16); // 간단한 해시
  };

  // 중복 제출 감지 (강화된 버전)
  const isDuplicateSubmission = (title: string, text: string) => {
    if (!lastSubmissionRef.current) return false;

    const currentHash = generateSubmissionHash(title, text);
    const lastHash =
      lastSubmissionRef.current.title && lastSubmissionRef.current.text
        ? generateSubmissionHash(lastSubmissionRef.current.title, lastSubmissionRef.current.text)
        : '';

    // 같은 내용이고 10분 이내에 제출 시도한 경우 중복으로 간주 (시간 증가)
    const timeDiff = Date.now() - lastSubmissionRef.current.timestamp;
    return currentHash === lastHash && timeDiff < 10 * 60 * 1000; // 10분으로 증가
  };

  // 🛡️ 버튼 비활성화 함수
  const disableSubmitButton = () => {
    setIsButtonDisabled(true);
    // 3초 후 버튼 재활성화
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    submitTimeoutRef.current = setTimeout(() => {
      setIsButtonDisabled(false);
    }, 3000);
  };

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

  // 🛡️ cleanup 함수 추가 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // 글자 수 계산 (공백 포함)
  const getCharCount = (str: string) => {
    return str.length;
  };

  const handleSubmitComplete = (res: any) => {
    setSubmissionState('complete');

    // 제출 완료 후 draft 상태 완전 초기화
    setText('');
    setTitle('');
    setSubmitted(true);
    setScore(res.data.data.score || null);
    setFeedback(res.data.data.feedback || null);

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
    // 🛡️ 강화된 중복 제출 방지
    if (submissionInProgress.current || isSubmitting || isButtonDisabled) {
      console.log('🚫 제출 중단: 이미 제출 중이거나 버튼이 비활성화됨');
      return;
    }

    if (!user) return alert('로그인이 필요합니다!');

    // 🚨 중복 제출 방지 강화
    if (submitted) {
      alert('이미 제출된 글입니다.');
      return;
    }

    // 🚨 같은 내용 중복 제출 방지
    if (isDuplicateSubmission(title, text)) {
      alert('❌ 같은 내용을 너무 빠르게 다시 제출할 수 없습니다.\n\n잠시 후 다시 시도해주세요.');
      return;
    }

    // 🛡️ 즉시 버튼 비활성화 (중복 클릭 방지)
    disableSubmitButton();

    // ✅ 제출 직전 최종 검증 - 실시간 텍스트 상태 사용
    const finalText = text.trim();
    const finalCharCount = getCharCount(finalText);
    const finalIsMinLengthMet = finalCharCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

    // 👉 제출 시작할 때 타이머 멈추기 (시간 계산 후에 중지)
    const finalDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // 🛑 타이머 완전 중지
    setStartTime(null); // 타이머 중지
    setIsStarted(false); // 시작 상태 해제
    setRemainingTime(0); // 남은 시간 0으로 설정

    if (!forceSubmit) {
      // 제목 검증 강화
      if (
        !title ||
        title === 'undefined' ||
        !title.trim() ||
        title.trim().length < CONFIG.SUBMISSION.TITLE.MIN_LENGTH
      ) {
        return alert(`제목을 ${CONFIG.SUBMISSION.TITLE.MIN_LENGTH}글자 이상 입력해주세요.`);
      }

      if (!finalText) {
        return alert('내용을 입력해주세요.');
      }

      if (!finalIsMinLengthMet) {
        return alert(
          `${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자 이상 입력해주세요. (현재: ${finalCharCount}자)`
        );
      }
    } else {
      // 자동 제출 시에도 최소 글자 수 확인
      if (!finalIsMinLengthMet) {
        // 간단한 사용자 선택 처리
        const safeTitle = title && title.trim().length > 0 ? title.trim() : '(제목 없음)';

        const userChoice = confirm(
          `⏰ 시간 초과로 자동 제출하려고 했지만 글자수가 부족해서 자동 제출이 불가능합니다.\n\n` +
            `📝 작성하신 내용:\n` +
            `제목: ${safeTitle}\n` +
            `내용: ${finalText.substring(0, 50)}${finalText.length > 50 ? '...' : ''}\n\n` +
            `현재 글자 수: ${finalCharCount}자 (필요: ${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자)\n\n` +
            `다시 작성하시겠습니까? (취소하면 메인페이지로 이동합니다)`
        );

        if (userChoice) {
          // 다시 작성 선택 시 - 타이머 재시작
          setStartTime(Date.now());
          setIsStarted(true);
          setRemainingTime(CONFIG.TIMER.DURATION_MINUTES * 60);
          return;
        } else {
          // 메인페이지로 이동
          navigate('/');
          return;
        }
      }
    }

    if (CONFIG.TOPIC.SHOW_ON_HOME_300 && !dailyTopic) {
      return alert('주제를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    // 🛡️ 제출 시작 - 모든 방어 로직 활성화
    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionState('submitting');
    setSubStep('loading'); // 초기엔 로딩 스피너
    setSubmissionProgress('글을 제출하고 있습니다...');

    // 현재 제출 정보 기록 (중복 방지용)
    lastSubmissionRef.current = {
      title: title.trim(),
      text: text.trim(),
      timestamp: Date.now(),
    };

    setTimeout(() => {
      setSubStep('evaluating');
      setSubmissionProgress('AI가 글을 읽고 평가하고 있어요... ✨');
    }, 1200); // 1.2초 뒤 평가로 전환

    try {
      // 사용자의 시간대 정보 가져오기
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();

      const submitData = {
        title: title || '',
        text: finalText,
        topic: dailyTopic || null,
        mode: 'mode_300',
        duration: finalDuration,
        forceSubmit: forceSubmit,
        isMinLengthMet: finalIsMinLengthMet,
        charCount: finalCharCount,
        timezone: userTimezone,
        offset: userOffset,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
      };

      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        alert('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        setSubmissionState('idle');
        setSubmissionProgress('');
        submissionInProgress.current = false;
        return;
      }

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const submissionId = res.data.data.submissionId;

      setTokens(res.data.data.tokens);
      setText('');
      setTitle('');
      setSubmitted(true);
      setIsStarted(false);

      // 🛡️ 제출 완료 - 모든 방어 로직 해제
      submissionInProgress.current = false;
      setIsSubmitting(false);
      setSubmissionHash(''); // 해시 초기화

      // 제출 완료 처리
      handleSubmitComplete(res);
    } catch (err: any) {
      logger.error('제출 중 오류 발생:', err.response?.data || err);

      // 🛡️ 에러 발생 시에도 모든 방어 로직 해제
      submissionInProgress.current = false;
      setIsSubmitting(false);
      setSubmissionState('idle');
      setSubmissionProgress('');

      // 에러 메시지 개선
      let errorMessage = '제출 중 오류가 발생했습니다.';

      if (err.response?.data?.message) {
        errorMessage += `\n\n상세: ${err.response.data.message}`;
      }

      // 🛡️ 중복 제출 에러 특별 처리
      if (err.response?.data?.code === 'DUPLICATE_SUBMISSION') {
        errorMessage =
          '❌ 중복 제출 방지\n\n같은 내용의 글을 너무 빠르게 다시 제출할 수 없습니다.\n\n잠시 후 다시 시도해주세요.';
      }

      if (err.code === 'NETWORK_ERROR' || err.message?.includes('timeout')) {
        errorMessage += '\n\n네트워크 연결을 확인하고 다시 시도해주세요.';
      }

      alert(errorMessage);
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

        // 🛑 타이머 상태 완전 정리
        setStartTime(null);
        setIsStarted(false);
        setRemainingTime(0);

        // 🛡️ 이미 제출 중이거나 완료된 경우 자동 제출 방지
        if (submissionInProgress.current || isSubmitting || submitted) {
          return;
        }

        // 🚨 자동 제출 전 최종 상태 확인

        // setTimeout으로 약간의 지연을 주어 상태 업데이트가 완료되도록 함
        setTimeout(() => {
          // 한 번 더 상태 확인 (이중 안전장치)
          if (!submissionInProgress.current && !isSubmitting && !submitted) {
            handleSubmit(true); // 강제 제출
          } else {
            // 자동 제출 취소: 제출 상태 변경됨
          }
        }, 200); // 200ms로 증가하여 상태 동기화 보장
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!user) return;

    const fetchTokens = async () => {
      try {
        // 인증 토큰 가져오기
        const token = await user.getIdToken();
        if (!token) return;

        // 사용자의 시간대 정보 가져오기
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userOffset = new Date().getTimezoneOffset();

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?mode=mode_300&timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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
        // 인증 토큰 가져오기
        const token = await user.getIdToken();
        if (!token) return;

        // 사용자의 시간대 정보 가져오기
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userOffset = new Date().getTimezoneOffset();

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/topic/today?mode=mode_300&timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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
                maxLength={CONFIG.SUBMISSION.TITLE.MAX_LENGTH}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-lg placeholder:text-base dark:bg-gray-600 dark:text-gray-300 ${
                  title.trim().length >= CONFIG.SUBMISSION.TITLE.MIN_LENGTH
                    ? 'border-gray-300'
                    : 'border-red-300 focus:ring-red-500'
                }`}
              />
              <span
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs md:text-sm ${
                  title.trim().length >= CONFIG.SUBMISSION.TITLE.MIN_LENGTH
                    ? 'text-gray-500'
                    : 'text-red-500'
                }`}
              >
                {title.length}/{CONFIG.SUBMISSION.TITLE.MAX_LENGTH}
              </span>
              {title.trim().length < CONFIG.SUBMISSION.TITLE.MIN_LENGTH && (
                <p className="text-red-500 text-sm mt-1">
                  ⚠️ 제목을 {CONFIG.SUBMISSION.TITLE.MIN_LENGTH}글자 이상 입력해주세요
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 스마트 글쓰기 가이드 (비활성화 - 향후 고도화 예정) */}
        {/* 
        <SmartWritingGuide 
          text={text}
          maxLength={CONFIG.SUBMISSION.MODE_300.MAX_LENGTH}
          mode="mode_300"
        />

        <EndingTemplateGuide
          text={text}
          maxLength={CONFIG.SUBMISSION.MODE_300.MAX_LENGTH}
          onInsertTemplate={template => {
            const newText = text + ' ' + template;
            if (newText.length <= CONFIG.SUBMISSION.MODE_300.MAX_LENGTH) {
              setText(newText);
            } else {
              alert('글자수 제한을 초과합니다. 더 짧은 템플릿을 선택해주세요.');
            }
          }}
        />
        */}

        {/* 글쓰기 영역 */}
        <div className="bg-white dark:bg-gray-800 text-black dark:text-gray-300 rounded-lg shadow-md p-4">
          <div className="relative mb-2">
            <textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (!startTime) setStartTime(Date.now()); // 처음 입력 시 타이머 시작
              }}
              placeholder={`250자 이상 500자 이내로 자유롭게 작성해보세요.`}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base placeholder:text-base dark:bg-gray-600 dark:text-gray-300"
              maxLength={500}
              disabled={tokens === 0}
            />
            <div className="absolute right-2 bottom-2 text-xs md:text-sm text-gray-500">
              {text.length}/500
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
              forceStop={submitted || submissionState === 'complete'}
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
                  setTitle('');
                  setStartTime(null);
                  setRemainingTime(CONFIG.TIMER.DURATION_MINUTES * 60);
                  setSubmissionState('idle');
                  setSubStep('loading');
                  setSubmissionProgress('');

                  // 새로운 글쓰기 시작 시 draft 상태 완전 초기화
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
                disabled={
                  tokens === 0 ||
                  !isMinLengthMet ||
                  !title ||
                  !title.trim() ||
                  title.trim().length < CONFIG.SUBMISSION.TITLE.MIN_LENGTH ||
                  submitted ||
                  isSubmitting ||
                  submissionInProgress.current ||
                  !startTime ||
                  isButtonDisabled // 버튼 비활성화 상태
                }
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  tokens === 0 ||
                  !isMinLengthMet ||
                  !title ||
                  !title.trim() ||
                  title.trim().length < CONFIG.SUBMISSION.TITLE.MIN_LENGTH ||
                  submitted ||
                  isSubmitting ||
                  submissionInProgress.current ||
                  !startTime ||
                  isButtonDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-800 dark:hover:bg-blue-900'
                }`}
              >
                {isSubmitting || submissionInProgress.current
                  ? '제출 중...'
                  : isButtonDisabled
                    ? '잠시만요...'
                    : '제출하기'}
              </button>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-2 text-xs md:text-sm text-gray-800 dark:text-gray-300">
          <p>💡 제목과 내용을 모두 작성한 후 제출할 수 있습니다.</p>
          <p>⏰ 제한 시간: {CONFIG.TIMER.DURATION_MINUTES}분</p>
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
