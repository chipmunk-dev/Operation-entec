import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildVersion =
  process.env.COMMIT_REF ||
  process.env.DEPLOY_ID ||
  process.env.VITE_APP_VERSION ||
  `local-${Date.now()}`;

const appVersionPlugin = () => ({
  name: 'app-version-manifest',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: `${JSON.stringify({ version: buildVersion }, null, 2)}\n`,
    });
  },
});

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
  },
  plugins: [react(), appVersionPlugin()],
});
