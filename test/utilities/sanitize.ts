import { normalize } from 'pathe'
import type { RenamiReport } from '../../src/lib'
import type { FileRenameReport } from '../../src/lib/rename-files'

/**
 * Remove the duration and temp path from the report.
 * Normalizes tempPath to forward slashes so replacements work on Windows.
 */
export function sanitizeOutput(report: FileRenameReport, tempPath: string): FileRenameReport {
	const normalizedTempPath = normalize(tempPath)
	return {
		...report,
		duration: 0, // Ignore duration
		files: report.files.map((file) => ({
			...file,
			filePathOriginal: file.filePathOriginal.replace(normalizedTempPath, ''),
			filePathRenamed: file.filePathRenamed!.replace(normalizedTempPath, ''),
		})),
	}
}

/**
 * Remove the duration and temp path from the report.
 * Normalizes tempPath to forward slashes so replacements work on Windows.
 */
export function sanitizeRenameReport(report: RenamiReport, tempPath: string): RenamiReport {
	const normalizedTempPath = normalize(tempPath)
	return {
		...report,
		duration: 0, // Ignore duration
		rules: report.rules.map((rule) => ({
			...rule,
			pattern: rule.pattern.map((p) => p.replace(normalizedTempPath, '')),
			report: sanitizeOutput(rule.report, normalizedTempPath),
		})),
	}
}
