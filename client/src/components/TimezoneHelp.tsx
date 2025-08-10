// client/src/components/TimezoneHelp.tsx
import React, { useState } from 'react';

const TimezoneHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            시간대 설정 문제가 감지되었습니다
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p className="mb-2">
              영국 시간 오후 5시 56분에 글을 썼는데 토큰이 다시 생긴 이유는 브라우저의 시간대 설정이
              한국으로 되어 있기 때문입니다.
            </p>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
            >
              {isOpen ? '해결 방법 숨기기' : '해결 방법 보기'}
            </button>

            {isOpen && (
              <div className="mt-3 space-y-3">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    🖥️ Windows에서 시간대 변경하기
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
                    <li>시작 메뉴 → 설정 → 시간 및 언어</li>
                    <li>날짜 및 시간 → 시간대</li>
                    <li>"(UTC+00:00) 런던" 선택</li>
                    <li>브라우저 새로고침</li>
                  </ol>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    🍎 macOS에서 시간대 변경하기
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Apple 메뉴 → 시스템 환경설정</li>
                    <li>날짜 및 시간 → 시간대</li>
                    <li>"런던" 선택</li>
                    <li>브라우저 새로고침</li>
                  </ol>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    🌐 브라우저에서 확인하기
                  </h4>
                  <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
                    <li>개발자 도구 열기 (F12)</li>
                    <li>콘솔 탭에서 다음 명령어 실행:</li>
                    <li className="bg-gray-100 dark:bg-gray-700 p-1 rounded font-mono text-xs">
                      Intl.DateTimeFormat().resolvedOptions().timeZone
                    </li>
                    <li>결과가 "Europe/London"이어야 정상</li>
                  </ol>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    💡 왜 이런 일이 발생하나요?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    시스템 시간대가 한국으로 설정되어 있으면, 브라우저가 한국 시간 기준으로 토큰
                    리셋 시간을 계산합니다. 영국 시간 17:56은 한국 시간 02:56(다음날)이므로 시스템이
                    다음날로 인식하여 토큰을 다시 지급합니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimezoneHelp;
