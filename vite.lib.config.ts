import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/lib/index.ts'),
            name: 'RTTTLSynth',
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
            formats: ['es', 'cjs'],
        },
        rollupOptions: {
            external: [],
        },
        sourcemap: true,
        target: 'es2022',
        emptyOutDir: true,
    },
});
