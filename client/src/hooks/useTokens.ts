import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { logger } from '../utils/logger';

interface TokenData {
  tokens_300: number;
  tokens_1000: number;
  bonusTokens: number;
}

export const useTokens = () => {
  const { user } = useUser();
  const [tokens, setTokens] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await axios.get<TokenData>(
        `${import.meta.env.VITE_API_URL}/api/tokens/${user.uid}`
      );

      setTokens({
        tokens_300: Number(response.data.tokens_300) || 0,
        tokens_1000: Number(response.data.tokens_1000) || 0,
        bonusTokens: Number(response.data.bonusTokens) || 0,
      });
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
    refetchTokens: fetchTokens,
  };
};
