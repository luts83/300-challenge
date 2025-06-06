import React from 'react';
import { TodaySummary } from './types';

interface FeedbackStatsProps {
  dailyFeedbackCount: number;
  todaySummary: TodaySummary;
}

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  dailyFeedbackCount,
  todaySummary,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 text-black dark:text-gray-300 rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📅 오늘의 피드백 현황</h3>

      <div className="space-y-3 sm:space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm dark:text-gray-300">
            <span>전체 진행률</span>
            <span className="font-medium dark:text-gray-300">{dailyFeedbackCount}/3</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-300">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(dailyFeedbackCount / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* 모드별 통계 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3 dark:bg-gray-600 dark:text-gray-300">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 dark:text-gray-300">
              300자 모드
            </div>
            <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-300">
              {todaySummary.mode_300}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 sm:p-3 dark:bg-gray-600 dark:text-gray-300">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 dark:text-gray-300">
              1000자 모드
            </div>
            <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-300">
              {todaySummary.mode_1000}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
