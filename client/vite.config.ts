import {defineConfig, type Plugin} from 'vite';
import {obfuscator} from 'rollup-obfuscator';

export default defineConfig({
    server: {
        host: '0.0.0.0',
        strictPort: true,
        proxy: {
            '/ws': {
                target: 'ws://localhost:3003/',
                ws: true,
                rewrite: (path) => path.replace(/^\/ws/, ''),
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            plugins: [obfuscator({}) as Plugin],
        },
    },
});
