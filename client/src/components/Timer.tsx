import React, { useEffect, useRef, useCallback } from 'react';

interface TimerProps {
  remainingTime: number;
  onTimeUp?: () => void;
  isActive?: boolean;
  mode?: '300' | '1000'; // 타이머 모드 추가
}

const Timer: React.FC<TimerProps> = ({
  remainingTime,
  onTimeUp,
  isActive = true,
  mode = '300',
}) => {
  const timeRef = useRef(remainingTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const formatTime = useCallback(
    (seconds: number) => {
      if (mode === '1000') {
        // 1000자 모드: 시/분/초 표시
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return {
          formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
          isWarning: false, // 1000자 모드는 경고 표시 없음
        };
      } else {
        // 300자 모드: 분/초 표시 + 30초 미만 시 경고
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return {
          formatted: `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
          isWarning: seconds <= 30,
        };
      }
    },
    [mode]
  );

  const updateDisplay = useCallback(() => {
    if (!displayRef.current) return;

    const { formatted, isWarning } = formatTime(timeRef.current);

    // 모드별 스타일 적용
    const baseStyle = 'font-mono mb-4 flex items-center gap-2';
    const modeStyle = mode === '1000' ? 'text-lg text-gray-600' : 'text-xl';
    const warningStyle = isWarning ? 'text-red-600 animate-pulse' : '';

    displayRef.current.className = `${baseStyle} ${modeStyle} ${warningStyle}`;

    // 모드별 아이콘과 시간 표시
    displayRef.current.innerHTML = `
      <span class="timer-icon">${mode === '1000' ? '⌛' : '⏱'}</span>
      <span class="timer-text">${formatted}</span>
    `;
  }, [mode]);

  useEffect(() => {
    timeRef.current = remainingTime;
    updateDisplay();
  }, [remainingTime]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (mode === '300') {
        // 300자 모드: 카운트다운
        timeRef.current -= 1;

        if (timeRef.current <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onTimeUp) onTimeUp();
          timeRef.current = 0;
        }
      } else {
        // 1000자 모드: 카운트업
        timeRef.current += 1;
      }

      updateDisplay();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onTimeUp, mode]);

  return (
    <div
      ref={displayRef}
      role="timer"
      aria-label={`${mode === '300' ? '남은 시간' : '경과 시간'}`}
    />
  );
};

export default React.memo(Timer);
