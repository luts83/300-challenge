import React, { useState, useCallback } from 'react';

interface User {
  uid: string;
  displayName: string;
  email: string;
  submissionCount?: number;
  lastSubmission?: string;
}

interface VirtualizedUserListProps {
  users: User[];
  selectedUser: string;
  onUserSelect: (uid: string) => void;
  searchTerm: string;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

const ITEM_HEIGHT = 70; // 카드 높이를 줄임 (가로 배치로 인해)

const VirtualizedUserList: React.FC<VirtualizedUserListProps> = ({
  users,
  selectedUser,
  onUserSelect,
  searchTerm,
  onLoadMore,
  hasMore,
  loading,
}) => {
  // 모든 기기에서 안전한 일반 리스트 사용
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // 모든 기기에서 안전한 일반 리스트 사용
  return (
    <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
      <div className="space-y-2 p-2">
        {users.map((user, index) => (
          <div
            key={user.uid}
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedUser === user.uid
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            onClick={() => onUserSelect(user.uid)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                  {user.displayName || '익명'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {user.email}
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap">
                  {user.submissionCount || 0}개 글
                </div>
              </div>
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="flex justify-center p-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            ) : (
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                더 보기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedUserList;
