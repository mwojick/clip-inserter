import { fontFamily } from 'tailwindcss/defaultTheme';
import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{svelte,ts}'],
	theme: {
		fontFamily: {
			...fontFamily,
			sans: ['Noto Sans JP', 'Noto Sans', ...fontFamily.sans]
		},
		extend: {}
	},
	plugins: [daisyui],
	daisyui: {
		themes: ['light', 'dark'],
		logs: false
	}
};
