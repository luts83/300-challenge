import React, { useState, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

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
  const [listHeight, setListHeight] = useState(400);

  // 모바일에서 AutoSizer 문제 방지
  const isMobile = window.innerWidth < 768;

  // 사용자 카드 렌더링 함수
  const UserCard = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const user = users[index];

      if (!user) return null;

      return (
        <div
          style={{
            ...style,
            padding: '4px 8px',
            boxSizing: 'border-box',
            width: '100%',
          }}
          className={`user-card-container ${selectedUser === user.uid ? 'selected' : ''}`}
        >
          <div
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all h-full w-full sm:items-center items-start ${
              selectedUser === user.uid
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            onClick={() => onUserSelect(user.uid)}
            style={{
              minHeight: '54px', // 최소 높이 조정
              display: 'flex',
              alignItems: 'center', // 세로 중앙 정렬
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {/* 이름과 이메일 */}
            <div className="flex-1 min-w-0 mr-2 sm:mr-3">
              {/* 모바일: 세로 배치 */}
              <div className="sm:hidden">
                <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                  {user.displayName || '익명'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {user.email}
                </div>
              </div>

              {/* 데스크탑: 가로 배치 */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                  {user.displayName || '익명'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>

            {/* 글 개수 */}
            <div className="flex-shrink-0">
              <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap">
                {user.submissionCount || 0}개 글
              </div>
            </div>
          </div>
        </div>
      );
    },
    [users, selectedUser, onUserSelect]
  );

  // 무한 스크롤 처리
  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: any) => {
      if (!scrollUpdateWasRequested && hasMore && !loading) {
        const maxScrollOffset = users.length * ITEM_HEIGHT - listHeight;
        if (scrollOffset >= maxScrollOffset - 200) {
          // 200px 전에 로드
          onLoadMore();
        }
      }
    },
    [users.length, hasMore, loading, listHeight, onLoadMore]
  );

  // 모바일에서는 일반 리스트 사용
  if (isMobile) {
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
                  onClick={onLoadMore}
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
  }

  // 데스크탑에서는 가상화된 리스트 사용
  return (
    <div className="h-96 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <AutoSizer onResize={({ height }) => setListHeight(height)}>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={users.length + (hasMore ? 1 : 0)}
            itemSize={ITEM_HEIGHT}
            width={width}
            onScroll={handleScroll}
            overscanCount={5} // 성능 최적화
            className="react-window-list"
            style={{
              overflowX: 'hidden', // 가로 스크롤 방지
            }}
          >
            {({ index, style }) => {
              if (index === users.length && hasMore) {
                return (
                  <div
                    style={{
                      ...style,
                      padding: '4px 8px',
                      boxSizing: 'border-box',
                    }}
                    className="flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    ) : (
                      <button
                        onClick={onLoadMore}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        더 보기
                      </button>
                    )}
                  </div>
                );
              }
              return <UserCard index={index} style={style} />;
            }}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedUserList;
