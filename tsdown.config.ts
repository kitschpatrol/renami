import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		dts: false,
		entry: 'src/bin/cli.ts',
		fixedExtension: false,
		outDir: 'dist/bin',
		platform: 'node',
	},
	{
		alias: {
			// Polyfill for filenamify's use of node:path
			'node:path': 'pathe',
		},
		entry: 'src/lib/index.ts',
		external: ['node:fs/promises'],
		outDir: 'dist/lib',
		platform: 'neutral',
		tsconfig: 'tsconfig.build.json',
	},
])
