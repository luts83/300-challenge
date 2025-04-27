import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@tanstack/react-virtual', '@tanstack/react-query'],
  },
  server: {
    force: true, // 강제로 의존성 최적화를 다시 실행
  },
});
