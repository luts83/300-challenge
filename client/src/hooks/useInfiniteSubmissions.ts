import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useInfiniteSubmissions = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ['submissions', userId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/submit/user/${userId}`,
        {
          params: {
            page: pageParam,
            limit: 20,
          },
        }
      );
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 20 ? pages.length + 1 : undefined;
    },
  });
};
