/* eslint-disable ts/require-await */

import { type FileAdapter } from './utilities/file'
import { type PathObject } from './utilities/path'
import {
	type CaseType,
	convertCase,
	getSafeFilename,
	stripIncrement,
	truncate,
} from './utilities/string'

/**
 * Must return JUST the file name, no path or extension
 * If it returns undefined, the next action will be used
 */
export type Transform<T extends Record<string, unknown> | undefined = undefined> = (
	filePath: PathObject,
	options: (T extends undefined ? Record<string, unknown> : T) & { fileAdapter: FileAdapter },
) => Promise<string | undefined>

/**
 * Ensures that the filename is filesystem-safe and Unicode normalized
 */
export async function safeTransform(
	filePath: PathObject,
	options: {
		defaultEmptyFilename: string
	},
): Promise<string> {
	const { defaultEmptyFilename } = options
	const { name } = filePath

	return getSafeFilename(name, defaultEmptyFilename)
}

/**
 * Truncates a filename at word boundaries and adds an ellipsis
 * Word boundaries include spaces, case changes (camelCase/PascalCase), hyphens, and underscores.
 */
export async function truncateTransform(
	filePath: PathObject,
	options: {
		fileSystemMaxLength: number
		maxLength: number
		truncateOnWordBoundary: boolean
		truncationString: string
	},
): Promise<string> {
	// TODO increment-aware truncation?
	const { fileSystemMaxLength, maxLength, truncateOnWordBoundary, truncationString } = options
	const { ext, name } = filePath

	return truncate(
		name,
		maxLength - ext.length,
		fileSystemMaxLength,
		truncateOnWordBoundary,
		truncationString,
	)
}

/**
 * Removes increment like (1) from the filename
 */
export async function stripIncrementTransform(filePath: PathObject): Promise<string> {
	const { name } = filePath
	return stripIncrement(name)
}

/**
 * Converts the filename to a different case
 */
export async function caseTransform(
	filePath: PathObject,
	options: { caseType: CaseType },
): Promise<string> {
	const { name } = filePath
	const { caseType } = options

	return convertCase(name, caseType)
}
