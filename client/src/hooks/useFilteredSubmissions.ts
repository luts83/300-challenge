import { useMemo } from 'react';
import { CONFIG } from '../config';

type SubmissionMode = 'mode_300' | 'mode_1000';

interface Submission {
  _id: string;
  title: string;
  text: string;
  user: { uid: string; email: string; displayName?: string };
  feedbackCount: number;
  hasGivenFeedback: boolean;
  createdAt?: string;
  mode: SubmissionMode;
}

const getAvailableModes = (userModes: Set<SubmissionMode>) => {
  if (!CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED) {
    return userModes;
  }

  const availableModes = new Set<SubmissionMode>();
  userModes.forEach(mode => {
    CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS[mode].forEach(allowedMode => {
      availableModes.add(allowedMode as SubmissionMode);
    });
  });
  return availableModes;
};

export const useFilteredSubmissions = (
  allSubmissions: Submission[],
  todaySubmissionModes: Set<SubmissionMode>,
  activeTab: 'all' | SubmissionMode,
  searchQuery: string,
  sortBy: 'date' | 'feedback',
  sortOrder: 'asc' | 'desc'
) => {
  return useMemo(() => {
    return allSubmissions
      .filter(item => !item.hasGivenFeedback)
      .filter(item => {
        const availableModes = getAvailableModes(todaySubmissionModes);
        return availableModes.has(item.mode);
      })
      .filter(item => {
        if (activeTab === 'all') return true;
        return item.mode === activeTab;
      })
      .filter(
        item =>
          item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'date') {
          return sortOrder === 'desc'
            ? new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
            : new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        } else {
          return sortOrder === 'desc'
            ? (b.feedbackCount || 0) - (a.feedbackCount || 0)
            : (a.feedbackCount || 0) - (b.feedbackCount || 0);
        }
      });
  }, [allSubmissions, todaySubmissionModes, activeTab, searchQuery, sortBy, sortOrder]);
};

export default useFilteredSubmissions;
