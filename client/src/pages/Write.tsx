// src/pages/Write.tsx

import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import OnboardingModal from '../components/OnboardingModal';
import DevTools from '../components/DevTools';

const Write = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 온보딩 표시 여부 확인
  useEffect(() => {
    if (!user) {
      console.log('🔍 [온보딩 디버깅] 사용자가 없음');
      return;
    }

    console.log('🔍 [온보딩 디버깅] 사용자 존재:', user.email);

    // 개발 환경에서 URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const forceOnboarding = urlParams.get('onboarding') === 'true';

    // 로컬스토리지에서 강제 온보딩 확인
    const forceOnboardingStorage = localStorage.getItem('forceOnboarding') === 'true';

    // 온보딩 완료 여부 확인
    const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';

    // 오늘 하루 보지 않기 확인
    const dontShowToday = localStorage.getItem('onboardingDontShowToday');
    const today = new Date().toDateString();
    const isDontShowToday = dontShowToday === today;

    // 신규 사용자 여부 확인 (가입일 기준)
    const userJoinDate = localStorage.getItem('userJoinDate');
    const isNewUser = localStorage.getItem('isNewUser') === 'true';

    console.log('🔍 [온보딩 디버깅] 로컬스토리지 상태:', {
      forceOnboarding,
      forceOnboardingStorage,
      onboardingCompleted,
      dontShowToday,
      today,
      isDontShowToday,
      userJoinDate,
      isNewUser,
    });

    // 7일 경과 여부 확인
    let isWithinSevenDays = false;
    if (userJoinDate) {
      const joinDate = new Date(userJoinDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
      isWithinSevenDays = daysDiff < 7;

      console.log('🔍 [온보딩 디버깅] 날짜 계산:', {
        joinDate: joinDate.toISOString(),
        now: now.toISOString(),
        daysDiff,
        isWithinSevenDays,
      });

      // 7일이 지났다면 신규 사용자 플래그 제거
      if (!isWithinSevenDays && isNewUser) {
        console.log('🔍 [온보딩 디버깅] 7일 경과로 신규 사용자 플래그 제거');
        localStorage.setItem('isNewUser', 'false');
      }
    }

    // 온보딩을 표시해야 하는 조건
    const shouldShowOnboarding =
      forceOnboarding ||
      forceOnboardingStorage ||
      (!onboardingCompleted && !isDontShowToday && isNewUser && isWithinSevenDays);

    console.log('🔍 [온보딩 디버깅] 온보딩 표시 조건:', {
      forceOnboarding,
      forceOnboardingStorage,
      condition1: !onboardingCompleted,
      condition2: !isDontShowToday,
      condition3: isNewUser,
      condition4: isWithinSevenDays,
      shouldShowOnboarding,
    });

    if (shouldShowOnboarding) {
      console.log('🔍 [온보딩 디버깅] 온보딩 모달 표시');
      setShowOnboarding(true);
    } else {
      console.log('🔍 [온보딩 디버깅] 온보딩 모달 표시 안함');
    }
  }, [user]);

  // 신규 사용자 감지 및 온보딩 표시
  useEffect(() => {
    const checkNewUser = async () => {
      if (!user) {
        console.log('🔍 [신규사용자 디버깅] 사용자가 없음');
        return;
      }

      console.log('🔍 [신규사용자 디버깅] 서버에서 신규 사용자 확인 시작:', user.email);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken: token }),
        });

        console.log('🔍 [신규사용자 디버깅] 서버 응답 상태:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 [신규사용자 디버깅] 서버 응답 데이터:', data);

          if (data.isNewUser) {
            console.log('🔍 [신규사용자 디버깅] 신규 사용자 감지! 로컬스토리지 업데이트');

            // 개발자 도구 시뮬레이션 중인지 확인
            const isSimulated =
              localStorage.getItem('isNewUser') === 'false' && localStorage.getItem('userJoinDate');

            if (!isSimulated) {
              // 실제 신규 사용자인 경우에만 로컬스토리지 업데이트
              localStorage.setItem('isNewUser', 'true');
              localStorage.setItem('userJoinDate', new Date().toISOString());
              // 신규 사용자이므로 온보딩 완료 플래그 제거
              localStorage.removeItem('onboardingCompleted');
            } else {
              console.log('🔍 [신규사용자 디버깅] 개발자 도구 시뮬레이션 중이므로 서버 응답 무시');
            }

            // "오늘 하루 보지 않기" 확인
            const dontShowToday = localStorage.getItem('onboardingDontShowToday');
            const today = new Date().toDateString();
            const isDontShowToday = dontShowToday === today;

            if (!isDontShowToday) {
              // 온보딩 표시
              console.log('🔍 [신규사용자 디버깅] 온보딩 모달 표시');
              setShowOnboarding(true);
            } else {
              console.log('🔍 [신규사용자 디버깅] 오늘 하루 보지 않기로 모달 표시 안함');
            }
          } else {
            console.log('🔍 [신규사용자 디버깅] 기존 사용자');
          }
        } else {
          console.log('🔍 [신규사용자 디버깅] 서버 응답 실패:', response.status);
        }
      } catch (error) {
        console.error('🔍 [신규사용자 디버깅] 신규 사용자 확인 실패:', error);
      }
    };

    checkNewUser();
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // 강제 온보딩 플래그 제거
    localStorage.removeItem('forceOnboarding');
  };

  const handleTriggerOnboarding = () => {
    setShowOnboarding(true);
  };

  return (
    <>
      <div className="h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-2xl sm:text-xl font-bold mb-4 dark:text-gray-300">
            ✍ 글쓰기 모드 선택
          </h1>
          <p className="text-base text-gray-600 mb-8 dark:text-gray-400">
            원하는 글쓰기 방식을 선택하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/write/300')}
              className="px-6 py-3 bg-blue-500 dark:bg-blue-900 hover:bg-blue-600 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-all duration-200 text-base min-h-[44px] shadow-sm"
            >
              🕒 300자 타임어택
            </button>
            <button
              onClick={() => navigate('/write/1000')}
              className="px-6 py-3 bg-purple-500 dark:bg-purple-900 hover:bg-purple-600 dark:hover:bg-purple-800 text-white rounded-lg font-medium transition-all duration-200 text-base min-h-[44px] shadow-sm"
            >
              ⏱ 1000자 타이머 글쓰기
            </button>
          </div>
        </div>
      </div>

      {/* 온보딩 모달 */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* 개발자 도구 */}
      <DevTools onTriggerOnboarding={handleTriggerOnboarding} />
    </>
  );
};

export default Write;
