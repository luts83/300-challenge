// client/src/components/TokenDisplay.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';

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
      console.log('토큰 정보 요청 시작:', user.uid);
      const response = await axios.get<TokenData>(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}`
      );
      console.log('받은 토큰 데이터:', response.data);

      // 명시적으로 각 필드를 설정
      setTokens({
        tokens_300: Number(response.data.tokens_300) || 0,
        tokens_1000: Number(response.data.tokens_1000) || 0,
        bonusTokens: Number(response.data.bonusTokens) || 0,
      });
      setError(null);
    } catch (error) {
      console.error('토큰 정보 조회 실패:', error);
      setError('토큰 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();

    // 1분마다 토큰 정보 갱신
    const interval = setInterval(fetchTokens, 180000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md mb-6">
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
      <div className="bg-white rounded-lg p-4 shadow-md mb-6">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-md mb-6">
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
