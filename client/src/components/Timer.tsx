import React, { useEffect, useState } from 'react';
import { CONFIG } from '../config';

interface TimerProps {
  onTimeUp?: () => void;
}

const Timer: React.FC<TimerProps> = ({ onTimeUp }) => {
  const initialMinutes = CONFIG.TIMER.DURATION_MINUTES;
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="text-xl font-mono mb-4">
      ⏱ {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

export default Timer;
