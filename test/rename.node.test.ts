import { describe, expect, it } from 'vitest'
import { type FileRenameReport, renameFiles, type RenameOptions } from '../src/lib'
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

describe('File processing tests', () => {
	// Setup the temp files fixture with source files from './test-files'
	const tempFiles = useTempFiles({
		cleanup: true, // Will clean up after each test
		prefix: 'my-test-',
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

		const cases: Array<RenameOptions['caseType']> = [
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
			dryRun: true,
			maxLength: 15,
			truncateOnWordBoundary: true,
		})

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
})
