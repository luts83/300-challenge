import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import axios from 'axios';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TokenInfo {
  tokens_300: number;
  tokens_1000: number;
  isWhitelisted: boolean;
  daysSinceJoin: number | null;
  nextRefreshDate: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 토큰 정보 가져오기
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!user || !isOpen) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/token/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTokenInfo(response.data);
      } catch (error) {
        console.error('토큰 정보 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, [user, isOpen]);

  const steps = [
    {
      title: '🎉 환영합니다!',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            글쓰기 챌린지 플랫폼에 오신 것을 환영합니다!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            이제 매일 글을 쓰며 성장해보세요.
          </p>
        </div>
      ),
    },
    {
      title: '🎯 토큰 시스템 이해하기',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🪙</div>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              토큰으로 글을 쓸 수 있어요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🟢</span>
                <h3 className="font-semibold text-green-800 dark:text-green-200">300자 모드</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">빠른 글쓰기 연습</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🔵</span>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">1000자 모드</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">깊이 있는 글쓰기</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '📅 토큰 지급 규칙',
      content: (
        <div className="space-y-4">
          {tokenInfo && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-4">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🎁</span>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  현재 보유 토큰
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {tokenInfo.tokens_300}
                  </div>
                  <div className="text-green-700 dark:text-green-300">300자 토큰</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {tokenInfo.tokens_1000}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">1000자 토큰</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tokenInfo?.isWhitelisted ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">⭐</span>
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                    챌린지 참여자
                  </h3>
                </div>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>• 300자 토큰: 매일 1개 지급</li>
                  <li>• 1000자 토큰: 주간 1개 지급</li>
                </ul>
                <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-300">
                    🎉 챌린지 신청자로 선정되어 매일 토큰을 받을 수 있습니다!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">🆕</span>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
                      신규 사용자 (7일 이내)
                    </h3>
                  </div>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• 300자 토큰: 매일 1개 지급</li>
                    <li>• 1000자 토큰: 주간 1개 지급</li>
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">⏰</span>
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                      가입 7일 이후
                    </h3>
                  </div>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• 300자 토큰: 주간 1개 지급</li>
                    <li>• 1000자 토큰: 주간 1개 지급</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '🚀 시작하기',
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">✍️</div>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            이제 첫 번째 글을 써보세요!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                🟢 300자 타임어택
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                빠르게 생각을 정리해보세요
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                🔵 1000자 타이머
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">깊이 있게 글을 써보세요</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // 온보딩 완료 상태 저장
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleDontShowToday = () => {
    // 오늘 날짜로 "오늘 하루 보지 않기" 설정
    const today = new Date().toDateString();
    localStorage.setItem('onboardingDontShowToday', today);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {steps[currentStep].title}
            </h2>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 진행률 표시 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>
                단계 {currentStep + 1} / {steps.length}
              </span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="mb-6 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : (
              steps[currentStep].content
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>

            <div className="flex justify-between items-center">
              <button
                onClick={handleDontShowToday}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                오늘 하루 보지 않기
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  건너뛰기
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {currentStep === steps.length - 1 ? '시작하기' : '다음'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
