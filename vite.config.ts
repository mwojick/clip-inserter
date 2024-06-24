import fs from 'fs';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

function afterBuild() {
	const assets = fileURLToPath(new URL('./dist/assets/', import.meta.url));

	const matches = fs.readdirSync(assets).filter((val) => {
		return val.match(/background.*/) !== null;
	});

	const bgFileName = matches[0];
	const background = fileURLToPath(new URL('./dist/background.js', import.meta.url));

	fs.writeFile(background, `import './assets/${bgFileName}';\n`, (err) => {
		if (err) {
			console.error(err);
		}
	});

	const manifestSrc = fileURLToPath(new URL('./manifest.json', import.meta.url));
	const manifestDest = fileURLToPath(new URL('./dist/manifest.json', import.meta.url));

	fs.copyFile(manifestSrc, manifestDest, (err) => {
		if (err) {
			console.error(err);
		}
	});
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		svelte(),
		{
			name: 'after-build',
			apply: 'build',
			closeBundle: afterBuild
		}
	],
	server: {
		port: 5173,
		strictPort: true,
		hmr: {
			port: 5173
		}
	},
	build: {
		rollupOptions: {
			input: {
				default_popup: fileURLToPath(new URL('./index.html', import.meta.url)),
				background: fileURLToPath(new URL('./src/background.ts', import.meta.url))
			}
		}
	}
});
