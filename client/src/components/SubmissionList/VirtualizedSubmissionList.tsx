import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef } from 'react';
import { SubmissionItem } from './SubmissionItem';

interface VirtualizedSubmissionListProps {
  submissions: Submission[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUnlockFeedback: (submission: Submission) => void;
}

export const VirtualizedSubmissionList: React.FC<VirtualizedSubmissionListProps> = ({
  submissions,
  expandedId,
  onToggleExpand,
  onUnlockFeedback,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // 예상 아이템 높이
    overscan: 5, // 추가로 렌더링할 아이템 수
  });

  return (
    <div ref={parentRef} className="h-[800px] overflow-auto" style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const submission = submissions[virtualItem.index];
          return (
            <div
              key={submission._id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SubmissionItem
                submission={submission}
                isExpanded={expandedId === submission._id}
                onToggleExpand={() => onToggleExpand(submission._id)}
                onUnlockFeedback={() => onUnlockFeedback(submission)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
