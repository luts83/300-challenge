// client/src/components/TimezoneDebug.tsx
import React, { useState } from 'react';
import { debugTimezone, validateUserTimezone } from '../utils/timezoneDebug';
import { useUser } from '../context/UserContext';
import { isAdmin } from '../utils/admin';

const TimezoneDebug: React.FC = () => {
  const { user } = useUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const handleDebug = () => {
    const info = debugTimezone();
    setDebugInfo(info);

    const valid = validateUserTimezone();
    setIsValid(valid);
  };

  const handleClear = () => {
    setDebugInfo(null);
    setIsValid(null);
    setIsVisible(false);
  };

  // 관리자가 아니면 표시하지 않음
  if (!user?.uid || !isAdmin(user.uid)) {
    return null;
  }

  // 박스가 숨겨져 있으면 아무것도 표시하지 않음
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">🕐 시간대 디버깅</h3>
        <button
          onClick={handleClear}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleDebug}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
        >
          시간대 정보 확인
        </button>

        {debugInfo && (
          <div className="text-xs space-y-1">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <div>
                <strong>시간대:</strong> {debugInfo.timezone}
              </div>
              <div>
                <strong>Offset:</strong> {debugInfo.offset}분
              </div>
              <div>
                <strong>현재 시간:</strong> {debugInfo.currentTime}
              </div>
              <div>
                <strong>로컬 시간:</strong> {debugInfo.localTime}
              </div>
            </div>

            {isValid !== null && (
              <div
                className={`p-2 rounded text-center ${
                  isValid
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}
              >
                {isValid ? '✅ 시간대 설정 정상' : '⚠️ 시간대 설정 확인 필요'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimezoneDebug;
