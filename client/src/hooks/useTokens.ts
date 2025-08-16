import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { logger } from '../utils/logger';

interface TokenData {
  tokens_300: number;
  tokens_1000: number;
  goldenKeys: number;
  lastRefreshed?: string;
  lastWeeklyRefreshed?: string;
}

// 전역 토큰 캐시 (메모리 누수 방지를 위한 WeakMap 사용)
const tokenCache = new Map<string, { data: TokenData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

export const useTokens = () => {
  const { user } = useUser();
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async (forceRefresh = false) => {
    if (!user) return;

    // 캐시된 데이터가 있고 강제 새로고침이 아닌 경우 캐시 사용
    const cacheKey = user.uid;
    const cached = tokenCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      setTokens(cached.data);
      return;
    }

    setIsLoading(true);
    try {
      // 인증 토큰 가져오기
      const token = await user.getIdToken();
      if (!token) {
        setError('인증 토큰을 가져올 수 없습니다.');
        setIsLoading(false);
        return;
      }

      // 사용자의 시간대 정보 가져오기
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userOffset = new Date().getTimezoneOffset();

      const response = await axios.get<TokenData>(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}?timezone=${encodeURIComponent(userTimezone)}&offset=${userOffset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const tokenData = {
        tokens_300: Number(response.data.tokens_300) || 0,
        tokens_1000: Number(response.data.tokens_1000) || 0,
        goldenKeys: Number(response.data.goldenKeys) || 0,
        lastRefreshed: response.data.lastRefreshed,
        lastWeeklyRefreshed: response.data.lastWeeklyRefreshed,
      };

      // 캐시에 저장
      tokenCache.set(cacheKey, { data: tokenData, timestamp: now });

      setTokens(tokenData);
      setError(null);
    } catch (err) {
      logger.error('토큰 정보 조회 실패:', err);
      setError('토큰 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [user]);

  return {
    tokens,
    isLoading,
    error,
    refetchTokens: () => fetchTokens(true), // 강제 새로고침
  };
};
