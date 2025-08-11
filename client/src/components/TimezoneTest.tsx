import React, { useState } from 'react';
import {
  convertUTCToUserTime,
  getCurrentTimezoneInfo,
  debugTimezone,
} from '../utils/timezoneUtils';

const TimezoneTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [utcTime, setUtcTime] = useState('2025-08-11T09:20:54.414Z');

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCurrentTimezone = () => {
    addLog('=== 현재 시간대 정보 ===');
    const info = getCurrentTimezoneInfo();
    addLog(`시간대: ${info.timezone}`);
    addLog(`Offset: ${info.offset}분`);
    addLog(`현재 시간: ${info.currentTime}`);
    addLog(`로컬 시간: ${info.localTime}`);

    debugTimezone();
  };

  const testTimezoneConversion = () => {
    addLog('=== 시간대 변환 테스트 ===');

    // 테스트 케이스들
    const testCases = [
      { timezone: 'Asia/Seoul', offset: -540, name: '한국' },
      { timezone: 'Europe/London', offset: 0, name: '영국 (UTC+0)' },
      { timezone: 'Europe/London', offset: -60, name: '영국 (서머타임 UTC+1)' },
      { timezone: 'America/New_York', offset: 300, name: '뉴욕 (UTC-5)' },
      { timezone: 'America/New_York', offset: 240, name: '뉴욕 (서머타임 UTC-4)' },
    ];

    testCases.forEach(testCase => {
      try {
        const userTime = convertUTCToUserTime(utcTime, testCase.timezone, testCase.offset);
        addLog(
          `${testCase.name}: ${userTime.toLocaleString('ko-KR', { timeZone: testCase.timezone })}`
        );
      } catch (error) {
        addLog(`${testCase.name}: 오류 - ${error}`);
      }
    });
  };

  const testSpecificCase = () => {
    addLog('=== 특정 케이스 테스트 ===');

    // 사용자가 제공한 케이스: 2025-08-11T09:20:54.414Z
    const testUTC = '2025-08-11T09:20:54.414Z';

    // 한국 시간 (UTC+9)
    const koreaTime = convertUTCToUserTime(testUTC, 'Asia/Seoul', -540);
    addLog(`한국 시간: ${koreaTime.toLocaleString('ko-KR')}`);

    // 영국 시간 (UTC+0, 서머타임 UTC+1)
    const ukTimeUTC0 = convertUTCToUserTime(testUTC, 'Europe/London', 0);
    const ukTimeUTC1 = convertUTCToUserTime(testUTC, 'Europe/London', -60);
    addLog(`영국 시간 (UTC+0): ${ukTimeUTC0.toLocaleString('ko-KR')}`);
    addLog(`영국 시간 (UTC+1): ${ukTimeUTC1.toLocaleString('ko-KR')}`);

    addLog(`원본 UTC: ${testUTC}`);
    addLog(`한국 시간으로 변환: ${koreaTime.toISOString()}`);
    addLog(`영국 시간으로 변환 (UTC+0): ${ukTimeUTC0.toISOString()}`);
    addLog(`영국 시간으로 변환 (UTC+1): ${ukTimeUTC1.toISOString()}`);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">시간대 변환 테스트</h1>

      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">테스트할 UTC 시간:</label>
          <input
            type="text"
            value={utcTime}
            onChange={e => setUtcTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2025-08-11T09:20:54.414Z"
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={testCurrentTimezone}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            현재 시간대 정보
          </button>

          <button
            onClick={testTimezoneConversion}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            시간대 변환 테스트
          </button>

          <button
            onClick={testSpecificCase}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            특정 케이스 테스트
          </button>

          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            로그 지우기
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">테스트 결과:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">테스트를 실행하면 결과가 여기에 표시됩니다.</p>
          ) : (
            testResults.map((result, index) => (
              <div
                key={index}
                className="text-sm font-mono text-gray-700 bg-white p-2 rounded border"
              >
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-semibold text-yellow-800 mb-2">사용자 케이스 분석:</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>• DB 저장: 2025-08-11T09:20:54.414Z (UTC)</p>
          <p>• 영국 서머타임: UTC+1 (10:20:54)</p>
          <p>• 한국 시간: UTC+9 (18:20:54)</p>
          <p>• 대시보드 표시: 오후 7시 20분 (1시간 차이 발생)</p>
        </div>
      </div>
    </div>
  );
};

export default TimezoneTest;
