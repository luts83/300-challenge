export interface Submission {
  _id: string;
  title: string;
  text: string;
  user: { uid: string; email: string; displayName?: string };
  feedbackCount: number;
  hasGivenFeedback: boolean;
  createdAt?: string;
  mode: 'mode_300' | 'mode_1000';
}

export interface Feedback {
  _id: string;
  content: string;
  submissionText?: string;
  submissionTitle?: string;
  createdAt: string;
  mode?: 'mode_300' | 'mode_1000';
  submissionAuthor?: { uid: string; email: string; displayName?: string };
  submissionCreatedAt?: string;
}

export interface TodaySummary {
  mode_300: number;
  mode_1000: number;
}

// 컴포넌트 Props 타입들도 여기로 이동
export interface FeedbackListProps {
  submissions: Submission[];
  feedbacks: { [id: string]: string };
  expanded: string | null;
  submittedIds: string[];
  onFeedbackChange: (id: string, value: string) => void;
  onSubmitFeedback: (id: string, e: React.MouseEvent) => void;
  onToggleExpand: (id: string) => void;
}

export interface MyFeedbacksProps {
  feedbacks: Feedback[];
  visibleCount: number;
  onLoadMore: () => void;
  totalCount: number;
}
