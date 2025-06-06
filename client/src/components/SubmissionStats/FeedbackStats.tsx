import React, { useState } from 'react';

interface FeedbackStatsProps {
  feedbackStats: {
    totalSubmissions: number;
    unlockedSubmissions: number;
    feedbackGiven: number;
    feedbackReceived: number;
    unlockRate: number;
    receivedFeedbackDetails?: Array<{
      feedbackId: string;
      submissionId: string;
      submissionTitle: string;
      submissionMode: string;
      submissionDate: string;
      feedbackContent: string;
      feedbackDate: string;
      fromUser: {
        displayName: string;
        email: string;
      };
    }>;
  };
  dailyFeedbackCount: number;
  weeklyGrowth: {
    submissions: number;
    thisWeek: number;
    lastWeek: number;
  };
}

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  feedbackStats,
  dailyFeedbackCount,
  weeklyGrowth,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6">
      {/* 헤더 섹션 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-300 flex items-center gap-1.5 sm:gap-2 ">
          <span className="text-xl">💫</span>
          피드백 활동
        </h2>
        <button className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-full transition-colors dark:text-gray-300 dark:hover:bg-gray-700">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 접혀있을 때의 간단한 요약 뷰 */}
      {!isExpanded && (
        <div className="mt-3 sm:mt-4">
          {/* 오늘의 피드백 진행 상태 */}
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="flex-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-300">
                <div
                  className="
                    h-full
                    bg-gradient-to-r from-blue-500 to-purple-500
                    dark:bg-gradient-to-r dark:from-blue-900 dark:to-purple-900
                    transition-all duration-300
                  "
                  style={{ width: `${Math.min((dailyFeedbackCount / 3) * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
              오늘 {dailyFeedbackCount}/3
            </span>
          </div>

          {/* 핵심 수치 요약 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {feedbackStats.totalSubmissions}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">작성글</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-purple-600">
                {feedbackStats.feedbackGiven}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">작성 피드백</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {feedbackStats.feedbackReceived}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">받은 피드백</p>
            </div>
          </div>
        </div>
      )}

      {/* 펼쳤을 때의 상세 통계 뷰 */}
      {isExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {/* 글 작성 통계 */}
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 dark:bg-blue-900/50">
            <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3 dark:text-gray-300">
              📝 글 작성 활동
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-2.5 sm:p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">총 작성글</p>
                <div className="flex items-end justify-between">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {feedbackStats.totalSubmissions}
                  </p>
                  <p className="text-xs text-green-600">
                    {weeklyGrowth.submissions > 0 && '+'}
                    {weeklyGrowth.submissions} 이번 주
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-2.5 sm:p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">피드백 언락률</p>
                <div className="space-y-2">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {feedbackStats.unlockRate}%
                  </p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${feedbackStats.unlockRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 피드백 교류 통계 */}
          <div className="bg-purple-50 rounded-lg p-3 sm:p-4 dark:bg-purple-900/50">
            <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3 dark:text-gray-300">
              💬 피드백 교류
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-2.5 sm:p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">작성한 피드백</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {feedbackStats.feedbackGiven}
                </p>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">오늘의 진행도</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(dailyFeedbackCount / 3) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-purple-600">
                      {dailyFeedbackCount}/3
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-2.5 sm:p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">받은 피드백</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {feedbackStats.feedbackReceived}
                </p>
                <p className="text-xs text-gray-500 mt-2 dark:text-gray-300">
                  평균{' '}
                  {(feedbackStats.feedbackReceived / feedbackStats.totalSubmissions || 0).toFixed(
                    1
                  )}
                  개/글
                </p>
              </div>
            </div>
          </div>

          {/* 전체 통계 요약 */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:bg-gradient-to-r dark:from-yellow-900/50 dark:to-orange-900 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3 dark:text-gray-300">
              📊 활동 요약
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white/60 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">언락된 글</p>
                <p className="text-base sm:text-lg font-bold text-orange-600">
                  {feedbackStats.unlockedSubmissions}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white/60 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">평균 피드백</p>
                <p className="text-base sm:text-lg font-bold text-orange-600">
                  {(feedbackStats.feedbackReceived / feedbackStats.totalSubmissions || 0).toFixed(
                    1
                  )}
                  <span className="text-xs">개</span>
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 text-black dark:text-white/60 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-1 dark:text-gray-300">달성률</p>
                <p className="text-base sm:text-lg font-bold text-orange-600">
                  {feedbackStats.unlockRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
