import React from 'react';
import { TodaySummary } from './types';

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
  todayFeedbackCount: {
    mode_300: number;
    mode_1000: number;
    total: number;
  };
  // 새로운 props 추가
  detailedUnlockStatus?: {
    mode300: {
      unlocked: boolean;
      progress: number;
      required: number;
      crossModeUsed: boolean;
      crossModeCount: number;
      hasSubmission: boolean;
    };
    mode1000: {
      unlocked: boolean;
      progress: number;
      required: number;
      crossModeUsed: boolean;
      crossModeCount: number;
      hasSubmission: boolean;
    };
    total: {
      unlocked: boolean;
      progress: number;
      required: number;
    };
  };
}

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  dailyFeedbackCount,
  weeklyGrowth,
  todayFeedbackCount,
  detailedUnlockStatus,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 text-black dark:text-gray-300 rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📅 오늘의 피드백 현황</h3>

      <div className="space-y-3 sm:space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm dark:text-gray-300">
            <span>전체 진행률</span>
            <span className="font-medium dark:text-gray-300">
              {dailyFeedbackCount}/3
              {detailedUnlockStatus?.total.unlocked && (
                <span className="ml-2 text-green-600">✅ 완료</span>
              )}
            </span>
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
          {/* 300자 모드 */}
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3 dark:bg-gray-600 dark:text-gray-300">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 dark:text-gray-300">
              300자 모드
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-300">
                  {todayFeedbackCount.mode_300}
                </span>
                {detailedUnlockStatus?.mode300.unlocked && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    언락됨 ✨
                  </span>
                )}
              </div>

              {detailedUnlockStatus?.mode300.crossModeUsed && (
                <div className="text-xs text-blue-600 bg-blue-50 p-1.5 rounded text-center">
                  💡 교차 피드백으로 언락!
                  <br />
                  (300자 {detailedUnlockStatus.mode300.progress}개 + 1000자{' '}
                  {detailedUnlockStatus.mode300.crossModeCount}개)
                </div>
              )}
            </div>
          </div>

          {/* 1000자 모드 */}
          <div className="bg-green-50 rounded-lg p-2 sm:p-3 dark:bg-gray-600 dark:text-gray-300">
            <div className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 dark:text-gray-300">
              1000자 모드
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-300">
                  {todayFeedbackCount.mode_1000}
                </span>
                {detailedUnlockStatus?.mode1000.unlocked && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    완료 ✅
                  </span>
                )}
              </div>

              {!detailedUnlockStatus?.mode1000.hasSubmission &&
                todayFeedbackCount.mode_1000 > 0 && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded text-center">
                    📝 교차 피드백으로 활용됨
                    <br />
                    (300자 모드 언락에 기여)
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
