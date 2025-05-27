import React from 'react';
import { CONFIG } from '../../config';

// CONFIG 타입 체크 추가
if (!CONFIG || !CONFIG.FEEDBACK) {
  console.error('CONFIG가 제대로 로드되지 않았습니다:', CONFIG);
}

interface FeedbackGuidanceProps {
  dailyFeedbackCount: number;
  availableModes: Set<'mode_300' | 'mode_1000'>;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const FeedbackGuidance: React.FC<FeedbackGuidanceProps> = ({
  dailyFeedbackCount,
  availableModes,
  isExpanded,
  onToggleExpand,
}) => {
  // 피드백 상태 정보
  const getStatusInfo = () => {
    if (dailyFeedbackCount >= CONFIG.FEEDBACK.REQUIRED_COUNT) {
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

  // 피드백 가능한 모드 안내 메시지 생성
  const getFeedbackGuidanceMessage = () => {
    // 1. 글 작성 여부 확인
    if (!availableModes || availableModes.size === 0) {
      return {
        modes: '피드백을 작성하려면 먼저 글을 작성해주세요',
        count: CONFIG.FEEDBACK.PER_SUBMISSION,
      };
    }

    // 2. 작성한 모드 확인
    const hasMode300 = availableModes.has('mode_300');
    const hasMode1000 = availableModes.has('mode_1000');

    // 3. 교차 피드백 설정 확인
    const crossModeEnabled = CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.ENABLED;

    // 4. 상황별 메시지 결정
    let modes = '';
    if (crossModeEnabled) {
      if (hasMode300 && hasMode1000) {
        modes = '300자, 1000자';
      } else if (hasMode300) {
        const allowedModes = CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS.mode_300;
        modes = allowedModes.map(mode => (mode === 'mode_300' ? '300자' : '1000자')).join(', ');
      } else if (hasMode1000) {
        const allowedModes = CONFIG.FEEDBACK.CROSS_MODE_FEEDBACK.RESTRICTIONS.mode_1000;
        modes = allowedModes.map(mode => (mode === 'mode_300' ? '300자' : '1000자')).join(', ');
      }
    } else {
      // 교차 피드백이 비활성화된 경우
      const modeTexts = Array.from(availableModes).map(mode =>
        mode === 'mode_300' ? '300자' : '1000자'
      );
      modes = modeTexts.join(', ');
    }

    return {
      modes,
      count: CONFIG.FEEDBACK.PER_SUBMISSION,
    };
  };

  const statusInfo = getStatusInfo();
  const guidanceMessage = getFeedbackGuidanceMessage();

  return (
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6 dark:border-gray-700">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-base sm:text-lg">{statusInfo.emoji}</span>
          <div>
            <h3 className={`text-base sm:text-lg font-medium ${statusInfo.textColor}`}>
              {statusInfo.statusText}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
              {dailyFeedbackCount}/{CONFIG.FEEDBACK.REQUIRED_COUNT} 완료
              {dailyFeedbackCount >= CONFIG.FEEDBACK.REQUIRED_COUNT && ' 🎉'}
            </p>
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
                    피드백 작성 가능: {guidanceMessage.modes} 모드의 글 ({guidanceMessage.count}개)
                  </>
                ) : (
                  <>
                    오늘 작성한 {guidanceMessage.modes} 모드의 글에만 피드백 작성 가능 (
                    {guidanceMessage.count}개)
                  </>
                )
              ) : (
                guidanceMessage.modes
              )}
            </p>

            {/* 피드백 규칙 안내 */}
            <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li className="flex items-center gap-1">
                <span className="text-blue-500">•</span>
                하루 {CONFIG.FEEDBACK.REQUIRED_COUNT}개의 피드백을 작성하면 당일 작성한 글의
                피드백을 볼 수 있습니다.
              </li>
              <li className="flex items-center gap-1">
                <span className="text-blue-500">•</span>
                주간 목표(월-금 5일) 달성 시 {CONFIG.TOKEN.GOLDEN_KEY}개의 황금열쇠가 지급됩니다.
              </li>
              <li className="flex items-center gap-1">
                <span className="text-blue-500">•</span>
                피드백은 최소 {CONFIG.FEEDBACK.MIN_LENGTH}자 이상 작성해야 합니다.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
