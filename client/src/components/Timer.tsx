import React, { useEffect, useState } from 'react';
import { CONFIG } from '../config';

interface TimerProps {
  remainingTime: number;
  onTimeUp?: () => void;
  isActive?: boolean;
}

const Timer: React.FC<TimerProps> = ({ remainingTime, onTimeUp, isActive = true }) => {
  const [secondsLeft, setSecondsLeft] = useState(remainingTime);

  // remainingTime이 변경될 때마다 secondsLeft 업데이트
  useEffect(() => {
    setSecondsLeft(remainingTime);
  }, [remainingTime]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp, isActive]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className={`text-xl font-mono mb-4 ${secondsLeft <= 30 ? 'text-red-600' : ''}`}>
      ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

export default Timer;
