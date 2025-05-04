import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@tanstack/react-virtual', '@tanstack/react-query'],
  },
  server: {
    host: '0.0.0.0',  // 모든 IP에서 접근 가능
    port: 5173,       // 기본 포트
    force: true,      // 강제로 의존성 최적화를 다시 실행
  },
});
