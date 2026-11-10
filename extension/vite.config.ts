import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

const now = new Date();
const madridFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const buildDateHour = madridFormatter.format(now).replace(',', '');
const buildTimeIso = now.toISOString();

function manifestVersionPlugin(): Plugin {
  return {
    name: 'manifest-version-plugin',
    closeBundle() {
      const manifestPath = resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          const manifest = JSON.parse(content);
          manifest.version_name = `${manifest.version || '1.0.0'} (${buildDateHour})`;
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
          console.log(`[manifestVersionPlugin] Updated manifest version_name to: ${manifest.version_name}`);
        } catch (err) {
          console.warn('[manifestVersionPlugin] Failed to update manifest.json:', err);
        }
      }
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTimeIso),
    __BUILD_VERSION__: JSON.stringify(`1.0.0 (${buildDateHour})`),
  },
  plugins: [manifestVersionPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
