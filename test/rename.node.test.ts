import { describe, expect, it } from 'vitest'
import { rename } from '../src/lib'
import { useTempFiles } from './fixtures/file-fixture'
import { sanitizeRenameReport } from './utilities/sanitize'

describe('recursive rename tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-test-',
		sourcePath: './test/assets',
	})

	it('should rename recursively with per-directory increments', async () => {
		const renameReport = await rename({
			config: {
				rules: [
					{
						options: {
							dryRun: true,
						},
						pattern: `${tempFiles.getTempPath()}/**/*`,
						// eslint-disable-next-line ts/require-await
						transforms: [async () => 'bla'],
					},
				],
			},
		})

		expect(renameReport).toBeDefined()
		expect(sanitizeRenameReport(renameReport, tempFiles.getTempPath())).toMatchSnapshot()
	})

	it('should use the config file', async () => {
		const renameReport = await rename({ config: './test/fixtures/test-config.ts' })

		expect(renameReport).toBeDefined()
		expect(sanitizeRenameReport(renameReport, process.cwd())).toMatchSnapshot()
	})
})
