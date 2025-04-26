// client/src/components/WeeklyProgress.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';

// 상수 정의
const CELEBRATION_DURATION = 5000; // 축하 화면 표시 시간 (5초)
const DAYS = ['월', '화', '수', '목', '금'] as const;
const TOTAL_DAYS = DAYS.length;

// 스타일 상수
const STYLES = {
  container: 'bg-white rounded-lg p-4 shadow-md',
  header: {
    wrapper: 'flex items-center justify-between mb-3',
    title: 'text-lg font-semibold',
    counter: 'text-sm text-gray-500',
  },
  daysGrid: 'grid grid-cols-5 gap-4',
  dayItem: {
    base: 'flex flex-col items-center p-3 rounded-lg transition-all transform hover:shadow-md',
    completed: 'bg-green-100 text-green-800 scale-105',
    incomplete: 'bg-gray-50 text-gray-500',
    label: 'text-sm font-medium mb-1',
    icon: 'text-xl',
  },
  remainingMessage: 'mt-4 text-center text-sm text-gray-600',
  celebration: {
    overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50',
    modal: 'bg-white rounded-lg p-8 text-center transform shadow-xl max-w-md mx-4',
    emoji: 'text-4xl mb-4',
    title: 'text-2xl font-bold mb-4',
    message: 'text-lg mb-4',
    bonus: 'text-blue-600 font-semibold mb-6',
    button: 'px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors',
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

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ className = '' }) => {
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

  useEffect(() => {
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

    fetchStreak();
  }, [user]);

  const completedDays = progress.filter(Boolean).length;
  const remainingDays = TOTAL_DAYS - completedDays;

  return (
    <>
      {showCelebration && (
        <div className={STYLES.celebration.overlay}>
          <div className={STYLES.celebration.modal}>
            <div className={STYLES.celebration.emoji}>🎉</div>
            <h2 className={STYLES.celebration.title}>축하합니다!</h2>
            <p className={STYLES.celebration.message}>이번 주 연속 작성 목표를 달성하셨어요!</p>
            <div className={STYLES.celebration.bonus}>보너스 토큰 1개가 지급되었습니다! ✨</div>
            <button onClick={() => setShowCelebration(false)} className={STYLES.celebration.button}>
              확인
            </button>
          </div>
        </div>
      )}

      <div className={`${STYLES.container} ${className}`}>
        <div className={STYLES.header.wrapper}>
          <h3 className={STYLES.header.title}>📅 이번 주 작성 현황</h3>
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

        {remainingDays > 0 && (
          <div className={STYLES.remainingMessage}>
            {remainingDays}일만 더 작성하면 보너스 토큰이 지급됩니다!
          </div>
        )}
      </div>
    </>
  );
};

export default WeeklyProgress;
