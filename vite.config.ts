import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // The server block is removed, as our custom Express server will handle it.
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // Fix: The 'process.cwd()' call was causing a TypeScript error because the type
        // definitions for 'process' were likely missing or incorrect in this context.
        // Switched to using `import.meta.url`, which is the standard and more robust
        // way to handle file paths in ES modules, resolving the alias to the project root.
        '@': fileURLToPath(new URL('.', import.meta.url)),
      }
    }
  }
});