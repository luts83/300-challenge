// client/src/components/SubmissionStats/WeeklyProgress.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';

// 상수 정의
const CELEBRATION_DURATION = 5000; // 축하 화면 표시 시간 (5초)
const DAYS = ['월', '화', '수', '목', '금'] as const;
const TOTAL_DAYS = DAYS.length;

// 스타일 상수
const STYLES = {
  container:
    'bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-3 sm:p-4 shadow-sm mb-4 sm:mb-6 border border-gray-100 dark:border-gray-700',
  header: {
    wrapper: 'flex items-center justify-between mb-2 sm:mb-3 dark:text-gray-300',
    title: 'text-base sm:text-lg font-semibold flex items-center gap-1.5 dark:text-gray-300',
    counter:
      'text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full dark:text-gray-300 dark:bg-gray-800',
  },
  daysGrid: 'grid grid-cols-5 gap-2 sm:gap-4 dark:text-gray-300',
  dayItem: {
    base: 'flex flex-col items-center p-2 sm:p-3 rounded-lg transition-all dark:text-gray-300 dark:bg-gray-700',
    completed: 'bg-green-100 text-green-800 dark:text-gray-300 dark:bg-green-900/50',
    incomplete: 'bg-gray-50 text-gray-500 dark:text-gray-300 dark:bg-gray-700',
    label: 'text-xs sm:text-sm font-medium mb-1 dark:text-gray-300 dark:bg-gray-700',
    icon: 'text-base sm:text-xl dark:text-gray-300 dark:bg-gray-700',
  },
  remainingMessage: 'mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300',
  celebration: {
    overlay:
      'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 dark:text-gray-300',
    modal:
      'bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-4 sm:p-6 text-center transform shadow-xl max-w-md w-full mx-auto border border-gray-100 dark:border-gray-700',
    emoji: 'text-3xl sm:text-4xl mb-3 sm:mb-4 dark:text-gray-300',
    title: 'text-xl sm:text-2xl font-bold mb-2 sm:mb-3 dark:text-gray-300',
    message: 'text-base sm:text-lg mb-3 sm:mb-4 dark:text-gray-300',
    bonus: 'text-blue-600 font-semibold mb-4 sm:mb-6 text-sm sm:text-base dark:text-gray-300',
    button:
      'w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium dark:text-gray-300',
  },
} as const;

interface WeeklyProgressProps {
  className?: string;
}

interface StreakData {
  weeklyProgress: boolean[];
  celebrationShown: boolean;
  lastStreakCompletion: string | null;
}

export const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ className = '' }) => {
  const { user } = useUser();
  const [progress, setProgress] = useState<boolean[]>(Array(TOTAL_DAYS).fill(false));
  const [showCelebration, setShowCelebration] = useState(false);

  const handleStreakCompletion = async () => {
    if (!user) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/streak/celebration/${user.uid}`);
      setTimeout(() => {
        setShowCelebration(false);
      }, CELEBRATION_DURATION);
    } catch (error) {
      toast.error('축하 상태 업데이트에 실패했습니다.');
    }
  };

  const fetchStreak = async () => {
    if (!user) return;
    try {
      const response = await axios.get<StreakData>(
        `${import.meta.env.VITE_API_URL}/api/streak/${user.uid}`
      );
      const { weeklyProgress, celebrationShown } = response.data;
      setProgress(weeklyProgress);

      const allCompleted = weeklyProgress.every(Boolean);
      if (allCompleted && !celebrationShown) {
        setShowCelebration(true);
        handleStreakCompletion();
      }
    } catch (error) {
      toast.error('연속 작성 현황 조회에 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchStreak();
  }, [user]);

  // 글 작성 완료 이벤트 구독
  useEffect(() => {
    const handleSubmissionComplete = () => {
      fetchStreak();
    };

    window.addEventListener('submissionComplete', handleSubmissionComplete);
    return () => window.removeEventListener('submissionComplete', handleSubmissionComplete);
  }, []);

  // 페이지 포커스될 때마다 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      fetchStreak();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const completedDays = progress.filter(Boolean).length;
  const remainingDays = TOTAL_DAYS - completedDays;

  // 연속 작성이 끊겼는지 확인하는 함수 추가
  const isStreakBroken = (progress: boolean[]): boolean => {
    for (let i = 0; i < progress.length; i++) {
      if (!progress[i]) {
        // 현재 날짜가 이전 날짜보다 이전이면 연속이 끊긴 것
        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay();
        if (i < dayOfWeek - 1) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <>
      {showCelebration && (
        <div className={STYLES.celebration.overlay}>
          <div className={STYLES.celebration.modal}>
            <div className={STYLES.celebration.emoji}>🎉</div>
            <h2 className={STYLES.celebration.title}>축하합니다!</h2>
            <p className={STYLES.celebration.message}>이번 주 연속 작성 목표를 달성하셨어요!</p>
            <div className={STYLES.celebration.bonus}>황금열쇠 1개가 지급되었습니다! ✨</div>
            <button onClick={() => setShowCelebration(false)} className={STYLES.celebration.button}>
              확인
            </button>
          </div>
        </div>
      )}

      <div className={`${STYLES.container} ${className}`}>
        <div className={STYLES.header.wrapper}>
          <h3 className={STYLES.header.title}>
            <span>📅</span>
            이번 주 작성 현황
          </h3>
          <div className={STYLES.header.counter}>
            {completedDays}/{TOTAL_DAYS}일
          </div>
        </div>

        <div className={STYLES.daysGrid}>
          {DAYS.map((day, index) => (
            <div
              key={day}
              className={`${STYLES.dayItem.base} ${
                progress[index] ? STYLES.dayItem.completed : STYLES.dayItem.incomplete
              }`}
            >
              <span className={STYLES.dayItem.label}>{day}</span>
              <span className={STYLES.dayItem.icon}>{progress[index] ? '✅' : '○'}</span>
            </div>
          ))}
        </div>

        {remainingDays > 0 ? (
          isStreakBroken(progress) ? (
            <div className={STYLES.remainingMessage}>
              🌟 이번 주는 연속 작성 챌린지에 성공하지 못하셨어요! 하지만 실망하지 마세요! 1000자
              글쓰기를 하면 황금열쇠 1개가 지급됩니다.
            </div>
          ) : (
            <div className={STYLES.remainingMessage}>
              🎯 이번 주 목표를 달성하려면 {remainingDays}일 더 작성해야 합니다. 매일 꾸준히
              작성하여 황금열쇠를 획득하세요!
            </div>
          )
        ) : (
          <div className={STYLES.remainingMessage}>
            🎉 축하합니다! 이번 주 연속 작성 목표를 달성하셨어요! 황금열쇠 1개가 지급되었습니다! ✨
          </div>
        )}
      </div>
    </>
  );
};
