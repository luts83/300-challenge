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
      className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
      aria-label="토큰 정보 새로고침"
    >
      <svg
        className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
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
      <div className="bg-white rounded-lg p-4 shadow-md mb-6 relative">
        <RefreshButton />
        <h3 className="text-lg font-semibold mb-3">보유 토큰</h3>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-8 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md mb-6 relative">
        <RefreshButton />
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-md mb-6 relative">
      <RefreshButton />
      <h3 className="text-lg font-semibold mb-3">보유 토큰</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">300자</div>
          <div className="text-xl font-bold text-blue-600">{tokens.tokens_300}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-sm text-gray-600">1000자</div>
          <div className="text-xl font-bold text-purple-600">{tokens.tokens_1000}</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-sm text-gray-600">보너스</div>
          <div className="text-xl font-bold text-yellow-600">{tokens.bonusTokens}</div>
        </div>
      </div>
    </div>
  );
};

export default TokenDisplay;
