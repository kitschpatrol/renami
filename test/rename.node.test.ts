/* eslint-disable ts/require-await */

import { describe, expect, it } from 'vitest'
import { type FileRenameReport, renameFiles, type Options } from '../src/lib'
import { fileCallback } from '../src/lib/actions/file'
import {
	frontmatterTemplate,
	markdownCallback,
	markdownTemplate,
} from '../src/lib/actions/markdown'
import { useTempFiles } from './fixtures/file-fixture'

function sanitizeOutput(report: FileRenameReport, tempPath: string): FileRenameReport {
	return {
		...report,
		duration: 0, // Ignore duration
		files: report.files.map((file) => ({
			...file,
			filePathOriginal: file.filePathOriginal.replace(tempPath, ''),
			filePathRenamed: file.filePathRenamed!.replace(tempPath, ''),
		})),
	}
}

describe('basic rename tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-test-',
		sourcePath: './test/assets/test-basic',
	})

	it('should do nothing if files are compliant', async () => {
		const files = await tempFiles.getFiles()

		const result = await renameFiles(files, [], {
			dryRun: true,
		})

		expect(result.duration).toBeLessThan(10)
		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/basic.md",
			      "filePathRenamed": "/basic.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/camelCaseFile.md",
			      "filePathRenamed": "/camelCaseFile.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/kebab-case-file.md",
			      "filePathRenamed": "/kebab-case-file.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/miXedC_aseF-ile.md",
			      "filePathRenamed": "/miXedC_aseF-ile.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/Sentence case file.md",
			      "filePathRenamed": "/Sentence case file.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/snake_case_file.md",
			      "filePathRenamed": "/snake_case_file.md",
			      "status": "unchanged",
			    },
			  ],
			}
		`)
	})

	it('should set the case appropriately', async () => {
		const files = await tempFiles.getFiles()

		const cases: Array<Options['caseType']> = [
			'camel',
			'kebab',
			'lowercase',
			'pascal',
			'preserve',
			'screaming-kebab',
			'screaming-snake',
			'sentence',
			'snake',
			'title',
			'uppercase',
		]

		for (const caseType of cases) {
			const result = await renameFiles(files, [], {
				caseType,
				dryRun: true,
			})

			expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchSnapshot()
		}
	})

	it('should truncate on word boundary requested', async () => {
		const files = await tempFiles.getFiles()
		const result = await renameFiles(files, [], {
			dryRun: false,
			maxLength: 15,
		})

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": false,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/basic.md",
			      "filePathRenamed": "/basic.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/camelCaseFile.md",
			      "filePathRenamed": "/camelCase....md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/kebab-case-file.md",
			      "filePathRenamed": "/kebab....md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/miXedC_aseF-ile.md",
			      "filePathRenamed": "/miXedC....md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/Sentence case file.md",
			      "filePathRenamed": "/Sentence....md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/snake_case_file.md",
			      "filePathRenamed": "/snake....md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})

	it('should use intermediate files as needed', async () => {
		const files = await tempFiles.getFiles()
		const result = await renameFiles(
			files,
			[
				async ({ name }) => {
					if (name === 'basic') {
						return 'camelCaseFile'
					}
					if (name === 'camelCaseFile') {
						return 'basic'
					}
				},
			],
			{
				dryRun: false,
			},
		)

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": false,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/camelCaseFile.md",
			      "filePathRenamed": "/basic.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/basic.md",
			      "filePathRenamed": "/camelCaseFile.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/kebab-case-file.md",
			      "filePathRenamed": "/kebab-case-file.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/miXedC_aseF-ile.md",
			      "filePathRenamed": "/miXedC_aseF-ile.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/Sentence case file.md",
			      "filePathRenamed": "/Sentence case file.md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/snake_case_file.md",
			      "filePathRenamed": "/snake_case_file.md",
			      "status": "unchanged",
			    },
			  ],
			}
		`)
	})

	it('should increment duplicate files as needed', async () => {
		const files = await tempFiles.getFiles()
		const result = await renameFiles(files, [async () => 'basic'], {
			dryRun: false,
		})

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": false,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/basic.md",
			      "filePathRenamed": "/basic (1).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/camelCaseFile.md",
			      "filePathRenamed": "/basic (2).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/kebab-case-file.md",
			      "filePathRenamed": "/basic (3).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/miXedC_aseF-ile.md",
			      "filePathRenamed": "/basic (4).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/Sentence case file.md",
			      "filePathRenamed": "/basic (5).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/snake_case_file.md",
			      "filePathRenamed": "/basic (6).md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})
})

describe('increment duplicate tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-test-',
		sourcePath: './test/assets/test-increment',
	})

	it('should preserve original increments suffixes', async () => {
		const files = await tempFiles.getFiles()

		const result = await renameFiles(
			files,
			[
				async ({ name }) => {
					if (name.startsWith('rename')) {
						return 'Basic'
					}
				},
			],
			{
				dryRun: true,
			},
		)

		expect(result.duration).toBeLessThan(20)
		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/Basic (1).md",
			      "filePathRenamed": "/Basic (1).md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/rename me 1.md",
			      "filePathRenamed": "/Basic (2).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/Basic (3).md",
			      "filePathRenamed": "/Basic (3).md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/rename me 2.md",
			      "filePathRenamed": "/Basic (4).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 3.md",
			      "filePathRenamed": "/Basic (5).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 4.md",
			      "filePathRenamed": "/Basic (6).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 5.md",
			      "filePathRenamed": "/Basic (7).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 6.md",
			      "filePathRenamed": "/Basic (8).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 7.md",
			      "filePathRenamed": "/Basic (9).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/Basic (10).md",
			      "filePathRenamed": "/Basic (10).md",
			      "status": "unchanged",
			    },
			    {
			      "filePathOriginal": "/rename me 8.md",
			      "filePathRenamed": "/Basic (11).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 9.md",
			      "filePathRenamed": "/Basic (12).md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/rename me 10.md",
			      "filePathRenamed": "/Basic (13).md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})
})

describe('markdown template tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-test-',
		sourcePath: './test/assets/test-frontmatter',
	})

	it('should handle markdown callback', async () => {
		const files = await tempFiles.getFiles()

		const result = await renameFiles(
			files,
			[markdownCallback(async (_, frontmatter) => String(frontmatter.title) || 'Untitled')],
			{
				dryRun: true,
			},
		)

		expect(result.duration).toBeLessThan(20)

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/frontmatter-1.md",
			      "filePathRenamed": "/Hello World.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/frontmatter-2.md",
			      "filePathRenamed": "/Some Title.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})

	it('should handle frontmatter templates', async () => {
		const files = await tempFiles.getFiles()

		const result = await renameFiles(files, [frontmatterTemplate('{title}')], {
			dryRun: true,
		})

		expect(result.duration).toBeLessThan(20)

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/frontmatter-1.md",
			      "filePathRenamed": "/Hello World.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/frontmatter-2.md",
			      "filePathRenamed": "/Some Title.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})

	it('should handle unist-util-select templates', async () => {
		const files = await tempFiles.getFiles()

		const result = await renameFiles(files, [markdownTemplate('Heading - {heading}')], {
			dryRun: true,
		})

		expect(result.duration).toBeLessThan(20)

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/frontmatter-1.md",
			      "filePathRenamed": "/Heading - Hello, world!.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/frontmatter-2.md",
			      "filePathRenamed": "/Heading - Some other headline!.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})
})

describe('generic file helper tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-test-',
		sourcePath: './test/assets/test-frontmatter',
	})

	it('should read all the file info', async () => {
		const files = await tempFiles.getFiles()

		const callbackAccumulator: unknown[] = []

		const result = await renameFiles(
			files,
			[
				fileCallback((path, fileBuffer, FileInfo) => {
					callbackAccumulator.push({ fileBuffer, FileInfo, path })
					// eslint-disable-next-line unicorn/no-useless-undefined
					return undefined
				}),
			],
			{
				dryRun: true,
			},
		)

		expect(result.duration).toBeLessThan(20)
		// Complex object is a pain to verify

		console.log(callbackAccumulator)

		expect(callbackAccumulator).toHaveLength(2)
	})
})
