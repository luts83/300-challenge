// client/src/components/TokenDisplay.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { toast } from 'react-hot-toast';

interface TokenData {
  tokens_300: number;
  tokens_1000: number;
  bonusTokens: number;
  lastRefreshed?: string;
}

const TokenDisplay = () => {
  const { user } = useUser();
  const [tokens, setTokens] = useState<TokenData>({
    tokens_300: 0,
    tokens_1000: 0,
    bonusTokens: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await axios.get<TokenData>(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}`
      );

      setTokens({
        tokens_300: Number(response.data.tokens_300) || 0,
        tokens_1000: Number(response.data.tokens_1000) || 0,
        bonusTokens: Number(response.data.bonusTokens) || 0,
      });
      setError(null);
    } catch (error) {
      const errorMessage = '토큰 정보를 불러오는데 실패했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    fetchTokens();
  }, [user]);

  // 새로고침 버튼 컴포넌트
  const RefreshButton = () => (
    <button
      onClick={fetchTokens}
      disabled={loading}
      className="absolute top-2 sm:top-4 right-2 sm:right-4 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
      aria-label="토큰 정보 새로고침"
    >
      <svg
        className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm mb-4 sm:mb-6 relative">
        <RefreshButton />
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-1.5">
          <span>🎫</span>
          <span>보유 토큰</span>
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16 mx-auto mb-1.5 sm:mb-2"></div>
              <div className="h-5 sm:h-6 bg-gray-200 rounded w-6 sm:w-8 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm mb-4 sm:mb-6 relative">
        <RefreshButton />
        <div className="text-sm sm:text-base text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm mb-4 sm:mb-6 relative">
      <RefreshButton />
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-1.5">
        <span>🎫</span>
        <span>보유 토큰</span>
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">300자</div>
          <div className="text-lg sm:text-xl font-bold text-blue-600 leading-none">
            {tokens.tokens_300}
          </div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">1000자</div>
          <div className="text-lg sm:text-xl font-bold text-purple-600 leading-none">
            {tokens.tokens_1000}
          </div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
          <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">보너스</div>
          <div className="text-lg sm:text-xl font-bold text-yellow-600 leading-none">
            {tokens.bonusTokens}
          </div>
        </div>
      </div>

      <div className="hidden sm:block mt-3 text-xs text-gray-500 space-y-1">
        <p className="flex items-center gap-1.5">
          <span>ℹ️</span>
          매일 자정에 300자/1000자 토큰이 1개씩 지급됩니다
        </p>
        <p className="flex items-center gap-1.5">
          <span>✨</span>
          보너스 토큰은 주간 목표 달성 시 지급됩니다
        </p>
      </div>
    </div>
  );
};

export default TokenDisplay;
