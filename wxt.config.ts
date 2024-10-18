import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	extensionApi: 'chrome',
	vite: () => ({
		resolve: {
			alias: {
				$lib: '/src/lib'
			}
		}
	}),
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: {
		manifest_version: 3,
		name: 'Clip Inserter',
		description:
			'Takes text copied to the clipboard and inserts it into the page. Clipboard icons created by Freepik - Flaticon.',
		version: '1.0.0',
		action: { default_popup: '/popup.html' },
		icons: {
			'16': '/icon/16.png',
			'32': '/icon/32.png',
			'64': '/icon/64.png',
			'128': '/icon/128.png'
		},
		options_ui: {
			page: '/popup.html',
			open_in_tab: true
		},
		permissions: [
			'tabs',
			'activeTab',
			'scripting',
			'clipboardRead',
			'clipboardWrite',
			'storage',
			'offscreen',
			'webNavigation'
		],
		host_permissions: ['http://*/*', 'https://*/*', 'file://*/*']
	}
});
