import type { FileRenameReport, RenameReport } from '../../src/lib'

/**
 * Remove the duration and temp path from the report.
 */
export function sanitizeOutput(report: FileRenameReport, tempPath: string): FileRenameReport {
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

/**
 * Remove the duration and temp path from the report.
 */
export function sanitizeRenameReport(report: RenameReport, tempPath: string): RenameReport {
	return {
		...report,
		duration: 0, // Ignore duration
		rules: report.rules.map((rule) => ({
			...rule,
			pattern: rule.pattern.map((p) => p.replace(tempPath, '')),
			report: sanitizeOutput(rule.report, tempPath),
		})),
	}
}
