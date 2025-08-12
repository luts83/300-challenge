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

    // ✅ 제출 직전 최종 검증 - 실시간 텍스트 상태 사용
    const finalText = text.trim();
    const finalCharCount = getCharCount(finalText);
    const finalIsMinLengthMet = finalCharCount >= CONFIG.SUBMISSION.MODE_300.MIN_LENGTH;

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
        // ✅ 안전한 클립보드 저장 함수
        const saveToClipboard = async (text: string) => {
          try {
            // 1. navigator.clipboard 시도 (navigator 존재 여부도 확인)
            if (
              typeof navigator !== 'undefined' &&
              navigator &&
              navigator.clipboard &&
              typeof navigator.clipboard.writeText === 'function'
            ) {
              await navigator.clipboard.writeText(text);
              return { success: true, method: 'clipboard' };
            }
          } catch (error) {
            console.warn('navigator.clipboard 실패:', error);
          }

          try {
            // 2. document.execCommand 대체 방법 (구형 브라우저)
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
              return { success: true, method: 'execCommand' };
            }
          } catch (error) {
            console.warn('execCommand 실패:', error);
          }

          // 3. 모든 방법 실패
          return { success: false, method: 'none' };
        };

        // 클립보드에 자동 저장 시도
        const safeTitle = title && title.trim().length > 0 ? title.trim() : '(제목 없음)';
        const contentToSave = `제목: ${safeTitle}\n\n내용:\n${finalText}`;
        const clipboardResult = await saveToClipboard(contentToSave);

        if (clipboardResult.success) {
          const userChoice = confirm(
            `⏰ 시간 초과로 자동 제출하려고 했지만 글자수가 부족해서 자동 제출이 불가능합니다.\n\n` +
              `✅ 클립보드에 자동 저장되었습니다!\n\n` +
              `📝 저장된 내용:\n` +
              `제목: ${safeTitle}\n` +
              `내용: ${finalText.substring(0, 50)}${finalText.length > 50 ? '...' : ''}\n\n` +
              `현재 글자 수: ${finalCharCount}자 (필요: ${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자)\n\n` +
              `다시 작성하시겠습니까? (취소하면 메인페이지로 이동합니다)`
          );

          if (userChoice) {
            // 다시 작성 선택 시 - 타이머 재시작
            setStartTime(Date.now());
            setIsStarted(true);
            return;
          } else {
            // 메인페이지로 이동
            navigate('/');
            return;
          }
        } else {
          // 클립보드 저장 실패 시 대안 제공 (유저 제스처 이후 재시도 포함)
          console.warn('클립보드 저장 실패, 대안 방법 시도');

          // 로컬 백업: 혹시라도 복구가 필요할 때를 대비
          try {
            localStorage.setItem('write300_backup', contentToSave);
          } catch (e) {
            console.warn('로컬 백업 저장 실패:', e);
          }

          // 사용자에게 내용을 수동으로 복사할 수 있도록 안내
          const manualCopyChoice = confirm(
            `⏰ 시간 초과로 자동 제출하려고 했지만 글자수가 부족해서 자동 제출이 불가능합니다.\n\n` +
              `❌ 클립보드 자동 저장에 실패했습니다.\n\n` +
              `📝 작성하신 내용을 수동으로 복사해주세요:\n\n` +
              `제목: ${safeTitle}\n` +
              `내용: ${finalText}\n\n` +
              `현재 글자 수: ${finalCharCount}자 (필요: ${CONFIG.SUBMISSION.MODE_300.MIN_LENGTH}자)\n\n` +
              `확인을 누르면 자동 복사를 다시 시도합니다. 취소하면 메인페이지로 이동합니다.`
          );

          if (manualCopyChoice) {
            // 사용자의 확인(제스처) 직후에 다시 복사 시도
            let copied = false;
            try {
              if (
                typeof navigator !== 'undefined' &&
                navigator &&
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === 'function'
              ) {
                await navigator.clipboard.writeText(contentToSave);
                copied = true;
              }
            } catch (e) {
              // ignore
            }

            if (!copied) {
              try {
                const ta = document.createElement('textarea');
                ta.value = contentToSave;
                ta.style.position = 'fixed';
                ta.style.left = '-999999px';
                ta.style.top = '-999999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
              } catch (e) {
                console.warn('재시도 복사 실패:', e);
              }
            }

            if (copied) {
              alert('✅ 작성 내용이 클립보드에 복사되었습니다. 계속 작성하실 수 있어요.');
            } else {
              alert('❌ 자동 복사에 실패했습니다. 표시된 내용을 직접 복사해 주세요.');
            }

            // 다시 작성 선택 시 - 타이머 재시작
            setStartTime(Date.now());
            setIsStarted(true);
            setRemainingTime(CONFIG.TIMER.DURATION_MINUTES * 60);
            submissionInProgress.current = false;
            setSubmissionState('idle');
            setSubmissionProgress('');
            return;
          } else {
            // 메인페이지로 이동
            navigate('/');
            return;
          }
        }
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
      // 사용자의 시간대 정보 가져오기
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();

      // ✅ 디버깅: 전송할 데이터 로그
      const submitData = {
        title: title || '', // title이 undefined인 경우 빈 문자열로 처리
        text: finalText, // ✅ 실시간 텍스트 사용
        topic: dailyTopic || null,
        mode: 'mode_300',
        duration: finalDuration,
        forceSubmit: forceSubmit,
        isMinLengthMet: finalIsMinLengthMet, // ✅ 실시간 검증 결과 사용
        charCount: finalCharCount, // ✅ 실시간 글자 수 사용
        timezone: userTimezone,
        offset: userOffset,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '익명',
        },
      };

      console.log('🚀 제출 데이터:', submitData);
      console.log('👤 사용자 정보:', user);

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`, submitData);

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
        // 사용자의 시간대 정보 가져오기
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userOffset = new Date().getTimezoneOffset();

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?mode=mode_300&timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`
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
