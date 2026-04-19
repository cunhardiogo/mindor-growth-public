import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

function readAsaasKey(): string {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8')
    const match = content.match(/^VITE_ASAAS_API_KEY=['"]?([^'"\r\n]+)['"]?$/m)
    return match?.[1]?.trim() ?? ''
  } catch {
    return ''
  }
}

const ASAAS_KEY = readAsaasKey()

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1000,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'https://mindor.com.br',
          changeOrigin: true,
          secure: true,
        },
        '/asaas-api': {
          target: 'https://api.asaas.com/v3',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/asaas-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('access_token', ASAAS_KEY)
            })
          },
        },
      },
    },
  };
});
