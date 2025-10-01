import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

interface DevToolsProps {
  onTriggerOnboarding: () => void;
}

const DevTools: React.FC<DevToolsProps> = ({ onTriggerOnboarding }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleResetOnboarding = () => {
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('onboardingDontShowToday'); // 오늘 하루 보지 않기 설정도 제거
    onTriggerOnboarding();
    setIsOpen(false);
  };

  const handleSimulateNewUser = () => {
    // 신규 사용자 시뮬레이션
    localStorage.setItem('userJoinDate', new Date().toISOString());
    localStorage.setItem('isNewUser', 'true');
    handleResetOnboarding();
  };

  const handleSimulateOldUser = async () => {
    // 7일 이후 사용자 시뮬레이션
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    localStorage.setItem('userJoinDate', oldDate.toISOString());
    localStorage.setItem('isNewUser', 'false');
    localStorage.setItem('onboardingCompleted', 'true'); // 온보딩 완료로 설정
    localStorage.removeItem('onboardingDontShowToday'); // 오늘 하루 보지 않기 설정 제거

    // 서버 MongoDB 가입일도 변경
    try {
      console.log('🔧 [개발자도구] 서버 가입일 변경 API 호출 시작');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dev/simulate-user-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAgo: 10 }),
      });
      console.log('🔧 [개발자도구] API 응답 상태:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 [개발자도구] 서버 가입일을 10일 전으로 변경 완료:', data);
      } else {
        const errorData = await response.json();
        console.error('🔧 [개발자도구] API 호출 실패:', errorData);
      }
    } catch (error) {
      console.error('🔧 [개발자도구] 서버 가입일 변경 실패:', error);
    }

    setIsOpen(false);
  };

  const handleSimulateSevenDayUser = async () => {
    // 정확히 7일 경과 사용자 시뮬레이션
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    localStorage.setItem('userJoinDate', sevenDaysAgo.toISOString());
    localStorage.setItem('isNewUser', 'false');
    localStorage.setItem('onboardingCompleted', 'true'); // 온보딩 완료로 설정
    localStorage.removeItem('onboardingDontShowToday'); // 오늘 하루 보지 않기 설정 제거

    // 서버 MongoDB 가입일도 변경
    try {
      console.log('🔧 [개발자도구] 서버 가입일 변경 API 호출 시작');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dev/simulate-user-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAgo: 7 }),
      });
      console.log('🔧 [개발자도구] API 응답 상태:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('🔧 [개발자도구] 서버 가입일을 7일 전으로 변경 완료:', data);
      } else {
        const errorData = await response.json();
        console.error('🔧 [개발자도구] API 호출 실패:', errorData);
      }
    } catch (error) {
      console.error('🔧 [개발자도구] 서버 가입일 변경 실패:', error);
    }

    setIsOpen(false);
  };

  const handleClearAll = () => {
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('userJoinDate');
    localStorage.removeItem('isNewUser');
    localStorage.removeItem('forceOnboarding');
    localStorage.removeItem('onboardingDontShowToday'); // 오늘 하루 보지 않기 설정도 제거
    console.log('🔧 [개발자도구] 모든 설정 초기화 완료');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="개발자 도구"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">개발자 도구</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            현재 사용자: {user?.email || '로그인 필요'}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleResetOnboarding}
              className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
            >
              온보딩 다시 보기
            </button>

            <button
              onClick={handleSimulateNewUser}
              className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
            >
              신규 사용자 시뮬레이션
            </button>

            <button
              onClick={handleSimulateOldUser}
              className="w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm transition-colors"
            >
              10일 이후 사용자 시뮬레이션
            </button>

            <button
              onClick={handleSimulateSevenDayUser}
              className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition-colors"
            >
              7일 경과 사용자 시뮬레이션
            </button>

            <button
              onClick={handleClearAll}
              className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
            >
              모든 설정 초기화
            </button>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>온보딩 완료: {localStorage.getItem('onboardingCompleted') ? '✅' : '❌'}</div>
              <div>가입일: {localStorage.getItem('userJoinDate') || '없음'}</div>
              <div>신규 사용자: {localStorage.getItem('isNewUser') || '없음'}</div>
              {(() => {
                const userJoinDate = localStorage.getItem('userJoinDate');
                if (userJoinDate) {
                  const joinDate = new Date(userJoinDate);
                  const now = new Date();
                  const daysDiff = Math.floor(
                    (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div>
                      경과일: {daysDiff}일 {daysDiff >= 7 ? '(7일 경과)' : '(7일 미만)'}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTools;
