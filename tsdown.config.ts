import { defineConfig } from 'tsdown'

export default defineConfig([
	// CLI
	{
		dts: false,
		entry: 'src/bin/cli.ts',
		fixedExtension: false,
		outDir: 'dist/bin',
		platform: 'node',
	},
	// Library
	{
		alias: {
			// Polyfill for filenamify's use of node:path
			'node:path': 'pathe',
		},
		deps: {
			neverBundle: ['node:fs/promises'],
		},
		entry: 'src/lib/index.ts',
		outDir: 'dist/lib',
		platform: 'neutral',
		tsconfig: 'tsconfig.build.json',
	},
])
