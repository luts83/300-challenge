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
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📅 오늘의 피드백 현황</h3>

      <div className="space-y-3 sm:space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span>전체 진행률</span>
            <span className="font-medium">{dailyFeedbackCount}/3</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(dailyFeedbackCount / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* 모드별 통계 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">300자 모드</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {todaySummary.mode_300}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">1000자 모드</div>
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {todaySummary.mode_1000}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
