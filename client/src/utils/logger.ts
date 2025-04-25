// client/src/utils/logger.ts
const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};
