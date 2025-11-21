import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: [
		'src/index.ts'
	],
	format: ['cjs', 'esm'],
	dts: {
		sourcemap: true
	},
	minify: true,
	skipNodeModulesBundle: true,
	target: false,
	sourcemap: true,
	tsconfig: './tsconfig.json',
});
