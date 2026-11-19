import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Port 5173 matches ADMIN_ORIGIN in apps/api/.env (CORS).
  server: { port: 5173, strictPort: true },
});
