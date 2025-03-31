import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	vite: () => ({
		resolve: {
			alias: {
				$lib: '/src/lib'
			}
		}
	}),
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte'],
	manifest: ({ browser }) => {
		const permissions = [
			'tabs',
			'activeTab',
			'scripting',
			'clipboardRead',
			'clipboardWrite',
			'storage',
			'webNavigation'
		];

		if (browser === 'chrome') {
			permissions.push('offscreen');
		}

		return {
			name: 'Clip Inserter',
			description: 'Takes text copied to the clipboard and inserts it into the page',
			version: '1.1.1',
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
			permissions,
			host_permissions: ['http://*/*', 'https://*/*', 'file://*/*'],
			browser_specific_settings: {
				gecko: {
					id: 'clip-inserter@example.com'
				}
			}
		};
	}
});
