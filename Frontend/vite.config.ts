import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const httpsOptions = {
  key: readFileSync(fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url))),
  cert: readFileSync(fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url))),
};

export default defineConfig({
  root: frontendRoot,
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    https: httpsOptions,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    https: httpsOptions,
  },
});
