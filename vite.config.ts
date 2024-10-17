import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' assert { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [svelte(), crx({ manifest })],
	server: {
		port: 5174,
		strictPort: true,
		hmr: {
			port: 5174
		}
	},
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	},
	build: {
		rollupOptions: {
			input: {
				offscreen: fileURLToPath(new URL('./src/offscreen/index.html', import.meta.url))
			}
		}
	}
});
