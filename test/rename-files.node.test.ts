/* eslint-disable ts/require-await */

import { describe, expect, it } from 'vitest'
import { renameFiles, transformHelper } from '../src/lib'
import { CASE_TYPE_NAMES } from '../src/lib/utilities/string'
import { useTempFiles } from './fixtures/file-fixture'
import { sanitizeOutput } from './utilities/sanitize'

const { fileCallback, markdownCallback } = transformHelper

describe('basic rename tests', () => {
	// Setup the temp files fixture with source files
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-files-test-',
		sourcePath: './test/assets/test-basic',
	})

	it('should do nothing if files are compliant', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
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
		const filePaths = await tempFiles.getFiles()

		const cases = CASE_TYPE_NAMES

		for (const caseType of cases) {
			const result = await renameFiles({
				filePaths,
				options: {
					caseType,
					dryRun: true,
				},
			})

			expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchSnapshot()
		}
	})

	it('should truncate on word boundary requested', async () => {
		const filePaths = await tempFiles.getFiles()
		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: false,
				maxLength: 15,
			},
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
		const filePaths = await tempFiles.getFiles()
		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: false,
			},
			transform: [
				async ({ filePath: { name } }) => {
					if (name === 'basic') {
						return 'camelCaseFile'
					}
					if (name === 'camelCaseFile') {
						return 'basic'
					}
				},
			],
		})

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
		const filePaths = await tempFiles.getFiles()
		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: false,
			},
			transform: [async () => 'basic'],
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
	// Setup the temp files fixture with source files
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-files-test-',
		sourcePath: './test/assets/test-increment',
	})

	it('should preserve original increments suffixes', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
			transform: [
				async ({ filePath: { name } }) => {
					if (name.startsWith('rename')) {
						return 'Basic'
					}
				},
			],
		})

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
	// Setup the temp files fixture with source files
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-files-test-',
		sourcePath: './test/assets/test-frontmatter',
	})

	it('should handle markdown callback', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
			transform: [
				markdownCallback(async ({ frontmatter }) => String(frontmatter.title) || 'Untitled'),
			],
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

	it('should handle frontmatter templates', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
			transform: [
				'{Studio Team[1]} - {title} - {Studio Team} - {Studio Team} - Yes - {Studio Team[1]} - {Studio Team[1]}',
			],
		})

		expect(result.duration).toBeLessThan(20)

		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/frontmatter-2.md",
			      "filePathRenamed": "/Some Title - Yes.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/frontmatter-1.md",
			      "filePathRenamed": "/Someone Else - Hello World - Eric Mika - Someone Else - Eric Mika - Someone Else - Yes - Someone Else - Someone Else.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})

	it('should handle unist-util-select templates', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
			transform: 'Heading - {{heading}}',
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
	// Setup the temp files fixture with source files
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-files-test-',
		sourcePath: './test/assets/test-frontmatter',
	})

	it('should read all the file info', async () => {
		const filePaths = await tempFiles.getFiles()

		const callbackAccumulator: unknown[] = []

		const result = await renameFiles({
			filePaths,
			options: {
				dryRun: true,
			},
			transform: [
				fileCallback(({ fileBuffer, fileInfo, filePath }) => {
					callbackAccumulator.push({ fileBuffer, fileInfo, filePath })
					// eslint-disable-next-line unicorn/no-useless-undefined
					return undefined
				}),
			],
		})

		expect(result.duration).toBeLessThan(20)

		// TODO
		// Sanitize this complex object
		expect(callbackAccumulator).toHaveLength(2)
	})
})

describe('ignore folder notes tests', () => {
	// Setup the temp files fixture with source files
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'renami-rename-files-test-',
		sourcePath: './test/assets/test-ignore-folder-notes',
	})

	it('should ignore folder notes if asked', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				caseType: 'screaming-kebab',
				dryRun: true,
				ignoreFolderNotes: true,
			},
		})

		expect(result.duration).toBeLessThan(10)
		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/folder/basic.md",
			      "filePathRenamed": "/folder/BASIC.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})

	it('should not ignore folder notes if asked', async () => {
		const filePaths = await tempFiles.getFiles()

		const result = await renameFiles({
			filePaths,
			options: {
				caseType: 'screaming-kebab',
				dryRun: true,
				ignoreFolderNotes: false,
			},
		})

		expect(result.duration).toBeLessThan(10)
		expect(sanitizeOutput(result, tempFiles.getTempPath())).toMatchInlineSnapshot(`
			{
			  "dryRun": true,
			  "duration": 0,
			  "files": [
			    {
			      "filePathOriginal": "/folder/basic.md",
			      "filePathRenamed": "/folder/BASIC.md",
			      "status": "renamed",
			    },
			    {
			      "filePathOriginal": "/folder/folder.md",
			      "filePathRenamed": "/folder/FOLDER.md",
			      "status": "renamed",
			    },
			  ],
			}
		`)
	})
})
