export interface Submission {
  _id: string;
  title: string;
  text: string;
  topic?: string; // 주제 필드 추가
  user: { uid: string; email: string; displayName?: string };
  feedbackCount: number;
  hasGivenFeedback: boolean;
  createdAt?: string;
  mode: 'mode_300' | 'mode_1000';
}

export interface Feedback {
  _id: string;
  content: string;
  // 구조화된 피드백 필드들
  strengths?: string;
  improvements?: string;
  overall?: string;
  submissionText?: string;
  submissionTitle?: string;
  submissionTopic?: string;
  toSubmissionId: string;
  createdAt: string;
  mode?: 'mode_300' | 'mode_1000';
  submissionAuthor?: { uid: string; email: string; displayName?: string };
  submissionCreatedAt?: string; // 원글 작성 날짜 (피드백 대상 글의 원래 작성 날짜)
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

export interface StructuredFeedback {
  overall: string; // 필수
  strengths?: string | undefined; // 선택사항으로 변경, undefined 허용
  improvements?: string | undefined; // 선택사항으로 변경, undefined 허용
}
