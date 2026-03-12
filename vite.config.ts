import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const DEV_PORT = Number(env.VITE_DEV_PORT) || 5173;
  const BACKEND_URL = env.VITE_BACKEND_URL || 'http://localhost:8001';

  return {
    base: '/',
    server: {
      host: '::',
      port: DEV_PORT,
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/admin': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3000,
    },
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});

