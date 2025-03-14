/* eslint-disable ts/require-await */
import { describe, expect, it } from 'vitest'
import { rename } from '../src/lib'
import { useTempFiles } from './fixtures/file-fixture'
import { sanitizeRenameReport } from './utilities/sanitize'

describe('rename tests', () => {
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
						transform: [async () => 'bla'],
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

	it('should apply only the last matching rule in an array if a file matches multiple rules', async () => {
		const renameReport = await rename({
			config: {
				rules: [
					{
						pattern: `${tempFiles.getTempPath()}/**/*`,
						transform: [async () => 'foo'],
					},
					{
						pattern: `${tempFiles.getTempPath()}/test-frontmatter/**/*`,
						transform: [async () => 'nope'],
					},
					{
						pattern: `${tempFiles.getTempPath()}/**/*`,
						transform: [async () => 'bar'],
					},
					{
						pattern: `${tempFiles.getTempPath()}/test-frontmatter/**/*`,
						transform: [async () => 'baz'],
					},
				],
			},
		})

		expect(renameReport).toBeDefined()
		expect(sanitizeRenameReport(renameReport, tempFiles.getTempPath())).toMatchSnapshot()
	})

	it('config should handle arrays of patterns', async () => {
		const renameReport = await rename({
			config: {
				rules: [
					{
						pattern: [
							`${tempFiles.getTempPath()}/test-frontmatter/**/*`,
							`${tempFiles.getTempPath()}/test-basic/**/*`,
						],
						transform: [async () => 'glob'],
					},
				],
			},
		})

		expect(renameReport).toBeDefined()
		expect(sanitizeRenameReport(renameReport, tempFiles.getTempPath())).toMatchSnapshot()
	})
})
