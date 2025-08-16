// useSubmissionFilter.ts
import { useMemo } from 'react';

interface Submission {
  _id: string;
  title: string;
  text: string;
  mode: 'mode_300' | 'mode_1000';
  createdAt: string;
  feedbacks?: any[];
  feedbackUnlocked?: boolean;
  likeCount?: number;
}

export const useSubmissionFilter = (
  submissions: any[],
  activeTab: 'all' | 'mode_300' | 'mode_1000',
  searchQuery: string,
  sortBy: 'date' | 'score' | 'feedback' | 'likes',
  sortOrder: 'asc' | 'desc',
  feedbackFilter: 'has_feedback' | 'open_feedback' | 'locked_feedback' | null
) => {
  return useMemo(() => {
    let filtered = [...submissions];

    // 모드 필터링
    if (activeTab !== 'all') {
      filtered = filtered.filter(submission => submission.mode === activeTab);
    }

    // 피드백 필터링
    if (feedbackFilter) {
      filtered = filtered.filter(submission => {
        const hasFeedback = (submission.feedbacks?.length || 0) > 0;
        switch (feedbackFilter) {
          case 'has_feedback':
            return hasFeedback;
          case 'open_feedback':
            return submission.feedbackUnlocked;
          case 'locked_feedback':
            return !submission.feedbackUnlocked;
          default:
            return true;
        }
      });
    }

    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        submission =>
          submission.title.toLowerCase().includes(query) ||
          submission.text.toLowerCase().includes(query)
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'feedback') {
        const aCount = a.feedbacks?.length || 0;
        const bCount = b.feedbacks?.length || 0;
        return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
      }

      if (sortBy === 'score') {
        // 추후 필요 시 추가
      }

      if (sortBy === 'likes') {
        const aLikes = a.likeCount || 0;
        const bLikes = b.likeCount || 0;
        return sortOrder === 'asc' ? aLikes - bLikes : bLikes - aLikes;
      }

      // 기본: 날짜순
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [submissions, activeTab, searchQuery, sortBy, sortOrder, feedbackFilter]);
};
