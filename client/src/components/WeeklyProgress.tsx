// client/src/components/WeeklyProgress.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';

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
  const [progress, setProgress] = useState<boolean[]>([false, false, false, false, false]);
  const [showCelebration, setShowCelebration] = useState(false);
  const days = ['월', '화', '수', '목', '금'];

  useEffect(() => {
    const fetchStreak = async () => {
      if (!user) return;
      try {
        const response = await axios.get<StreakData>(
          `${import.meta.env.VITE_API_URL}/api/streak/${user.uid}`
        );
        const { weeklyProgress, celebrationShown } = response.data;
        setProgress(weeklyProgress);

        // 모든 요일이 완료되었고 아직 celebration이 표시되지 않은 경우에만 축하화면 표시
        const allCompleted = weeklyProgress.every(Boolean);
        if (allCompleted && !celebrationShown) {
          setShowCelebration(true);
          // 서버에 celebration 상태 업데이트
          await axios.post(`${import.meta.env.VITE_API_URL}/api/streak/celebration/${user.uid}`);

          // 5초 후에 자동으로 축하 화면 닫기
          setTimeout(() => {
            setShowCelebration(false);
          }, 5000);
        }
      } catch (error) {
        console.error('연속 작성 현황 조회 실패:', error);
      }
    };

    fetchStreak();
  }, [user]);

  return (
    <>
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 text-center transform shadow-xl max-w-md mx-4">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4">축하합니다!</h2>
            <p className="text-lg mb-4">이번 주 연속 작성 목표를 달성하셨어요!</p>
            <div className="text-blue-600 font-semibold mb-6">
              보너스 토큰 1개가 지급되었습니다! ✨
            </div>
            <button
              onClick={() => setShowCelebration(false)}
              className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-lg p-4 shadow-md ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">이번 주 작성 현황</h3>
          <div className="text-sm text-gray-500">{progress.filter(Boolean).length}/5일</div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {days.map((day, index) => (
            <div
              key={day}
              className={`flex flex-col items-center p-3 rounded-lg transition-all transform
                ${
                  progress[index]
                    ? 'bg-green-100 text-green-800 scale-105'
                    : 'bg-gray-50 text-gray-500'
                }
                hover:shadow-md`}
            >
              <span className="text-sm font-medium mb-1">{day}</span>
              <span className="text-xl">{progress[index] ? '✅' : '○'}</span>
            </div>
          ))}
        </div>
        {progress.filter(Boolean).length < 5 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            {5 - progress.filter(Boolean).length}일만 더 작성하면 보너스 토큰이 지급됩니다!
          </div>
        )}
      </div>
    </>
  );
};

export default WeeklyProgress;
