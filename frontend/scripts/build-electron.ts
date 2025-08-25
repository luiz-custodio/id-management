import { build } from 'vite';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function buildElectron() {
  console.log('🔨 Building Electron main process...');
  
  // Build do processo principal do Electron
  await build({
    configFile: false,
    build: {
      lib: {
        entry: 'electron/main.ts',
        formats: ['cjs'],
        fileName: 'main'
      },
      rollupOptions: {
        external: ['electron', 'electron-updater']
      },
      outDir: 'dist-electron',
      emptyOutDir: false
    }
  });

  // Build do preload script
  await build({
    configFile: false,
    build: {
      lib: {
        entry: 'electron/preload.ts',
        formats: ['cjs'],
        fileName: 'preload'
      },
      rollupOptions: {
        external: ['electron']
      },
      outDir: 'dist-electron',
      emptyOutDir: false
    }
  });

  console.log('✅ Electron build completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildElectron().catch(console.error);
}

export { buildElectron };
