import React from 'react';
import { CONFIG } from '../../config';

// CONFIG 타입 체크 추가
if (!CONFIG || !CONFIG.FEEDBACK) {
  console.error('CONFIG가 제대로 로드되지 않았습니다:', CONFIG);
}

interface FeedbackGuidanceProps {
  dailyFeedbackCount: number;
  todayFeedbackCount: {
    mode_300: number;
    mode_1000: number;
    total: number;
  };
  availableModes: Set<string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
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

export const FeedbackGuidance: React.FC<FeedbackGuidanceProps> = ({
  dailyFeedbackCount,
  todayFeedbackCount,
  availableModes,
  isExpanded,
  onToggleExpand,
  detailedUnlockStatus,
}) => {
  // 피드백 상태 정보
  const getStatusInfo = () => {
    // 황금열쇠로 이미 언락했는지 확인 (props로 전달받아야 함)
    const hasUnlockedWithGoldenKey = false; // TODO: props로 전달받기

    const hasMode300 = availableModes.has('mode_300');
    const hasMode1000 = availableModes.has('mode_1000');

    // 300자 모드와 1000자 모드 각각의 완료 여부 확인
    const mode300Completed =
      hasMode300 && todayFeedbackCount.mode_300 >= CONFIG.FEEDBACK.REQUIRED_COUNT;
    const mode1000Completed = hasMode1000 && todayFeedbackCount.mode_1000 >= 1;

    if (hasUnlockedWithGoldenKey) {
      return {
        emoji: '🔑',
        statusText: '황금열쇠로 피드백 언락 완료!',
        textColor: 'text-yellow-600 dark:text-yellow-300',
      };
    }

    if (mode300Completed || mode1000Completed) {
      return {
        emoji: '✅',
        statusText: '오늘 피드백 미션 완료!',
        textColor: 'text-green-600 dark:text-green-300',
      };
    }

    return {
      emoji: '✨',
      statusText: '오늘의 피드백 미션',
      textColor: 'text-gray-800 dark:text-gray-300',
    };
  };

  const statusInfo = getStatusInfo();
  const hasMode300 = availableModes.has('mode_300');
  const hasMode1000 = availableModes.has('mode_1000');

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6 dark:border-gray-700">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-base sm:text-lg">{statusInfo.emoji}</span>
          <div>
            <h3 className={`text-base sm:text-lg font-medium ${statusInfo.textColor}`}>
              {statusInfo.statusText}
            </h3>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
              {hasMode300 && (
                <p>
                  300자 모드:
                  {detailedUnlockStatus?.mode300.unlocked ? (
                    <span className="text-green-600 font-medium"> 언락됨 ✨</span>
                  ) : (
                    <>
                      {todayFeedbackCount.mode_300}/{CONFIG.FEEDBACK.REQUIRED_COUNT}
                      {todayFeedbackCount.mode_1000 > 0 && (
                        <span className="text-blue-600">
                          {' '}
                          + 교차 피드백 {todayFeedbackCount.mode_1000}개 = 총{' '}
                          {todayFeedbackCount.total}/{CONFIG.FEEDBACK.REQUIRED_COUNT}
                        </span>
                      )}
                      {todayFeedbackCount.total < CONFIG.FEEDBACK.REQUIRED_COUNT && (
                        <span className="text-gray-600 text-xs">
                          {' '}
                          (언락까지 {CONFIG.FEEDBACK.REQUIRED_COUNT - todayFeedbackCount.total}개 더
                          필요)
                        </span>
                      )}
                    </>
                  )}
                </p>
              )}
              {hasMode1000 && (
                <p>
                  1000자 모드: {todayFeedbackCount.mode_1000}/1
                  {detailedUnlockStatus?.mode1000.unlocked ? (
                    <span className="text-green-600 font-medium"> 완료 ✅</span>
                  ) : (
                    todayFeedbackCount.mode_1000 >= 1 && ' 🎉'
                  )}
                </p>
              )}

              {/* 1000자 모드가 없지만 교차 피드백으로 활용된 경우 */}
              {!hasMode1000 && todayFeedbackCount.mode_1000 > 0 && (
                <p className="text-gray-600 text-sm">
                  1000자 모드: 글을 작성하지 않음
                  <span className="text-blue-600 ml-1">
                    교차 피드백으로 활용됨 (300자 모드 언락에 기여)
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
        <span className="text-gray-400 dark:text-gray-300 dark:hover:text-gray-100">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          {/* 현재 작성 가능한 모드 표시 */}
          {availableModes.size > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {Array.from(availableModes).map(mode => (
                <span
                  key={mode}
                  className={`text-xs sm:text-sm px-2 py-0.5 rounded-full ${
                    mode === 'mode_300'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300'
                  }`}
                >
                  {mode === 'mode_300' ? '300자' : '1000자'} 글쓰기
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            {/* 피드백 작성 가능 모드 안내 */}
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              {availableModes.size > 0 ? (
                CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED ? (
                  <>
                    피드백 작성 가능:{' '}
                    {Array.from(availableModes)
                      .map(mode => (mode === 'mode_300' ? '300자' : '1000자'))
                      .join(', ')}{' '}
                    모드의 글
                  </>
                ) : (
                  <>
                    오늘 작성한{' '}
                    {Array.from(availableModes)
                      .map(mode => (mode === 'mode_300' ? '300자' : '1000자'))
                      .join(', ')}{' '}
                    모드의 글에만 피드백 작성 가능
                  </>
                )
              ) : (
                '피드백을 작성하려면 먼저 글을 작성해주세요'
              )}
            </p>

            {/* 피드백 규칙 안내 */}
            <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {hasMode300 && (
                <li className="flex items-center gap-1">
                  <span className="text-blue-500">•</span>
                  300자 모드: 하루 {CONFIG.FEEDBACK.REQUIRED_COUNT}개의 피드백을 작성하면 당일
                  작성한 글의 피드백을 볼 수 있습니다.
                  {detailedUnlockStatus?.mode300.crossModeUsed && (
                    <span className="text-blue-600 font-medium"> (교차 피드백으로 언락 완료!)</span>
                  )}
                </li>
              )}
              {hasMode1000 && (
                <li className="flex items-center gap-1">
                  <span className="text-blue-500">•</span>
                  1000자 모드: 피드백 1개만 작성하면 당일 작성한 글의 피드백을 볼 수 있습니다.
                  {detailedUnlockStatus?.mode1000.unlocked && (
                    <span className="text-green-600 font-medium"> (언락 완료!)</span>
                  )}
                </li>
              )}
              <li className="flex items-center gap-1">
                <span className="text-blue-500">•</span>
                주간 목표(월-금 5일) 달성 시 {CONFIG.TOKEN.GOLDEN_KEY}개의 황금열쇠가 지급됩니다.
              </li>
            </ul>

            {/* 교차 피드백 설명 추가 */}
            {CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-medium mb-1">💡 교차 피드백이란?</p>
                <p className="text-xs text-blue-700">
                  300자 모드의 피드백을 3개 채우지 않아도, 1000자 모드 피드백과 함께 총 3개가 되면
                  언락됩니다!
                </p>
              </div>
            )}

            {/* 전체 완료 상태 표시 */}
            {detailedUnlockStatus?.total.unlocked && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800 font-medium text-center text-sm">
                  🎉 모든 피드백 미션 완료!
                </div>
                <div className="text-green-700 text-xs text-center mt-1">
                  오늘 작성한 모든 글의 피드백을 볼 수 있습니다
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
