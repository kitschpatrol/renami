import type { RenamiReport } from '../../src/lib'
import type { FileRenameReport } from '../../src/lib/rename-files'

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
export function sanitizeRenameReport(report: RenamiReport, tempPath: string): RenamiReport {
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
