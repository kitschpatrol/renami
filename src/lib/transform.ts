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
 * Can return either JUST the file name, with no path or extension, OR a PathObject...
 * If it returns undefined, the next action will be used
 */
export type Transform = (context: {
	fileAdapter: FileAdapter
	filePath: PathObject
}) => Promise<PathObject | string | undefined>

/**
 * Ensures that the filename is filesystem-safe and Unicode normalized
 */
export function safeTransform(defaultEmptyFilename: string): Transform {
	return async (context) => getSafeFilename(context.filePath.name, defaultEmptyFilename)
}

/**
 * Truncates a filename at word boundaries and adds an ellipsis
 * Word boundaries include spaces, case changes (camelCase/PascalCase), hyphens, and underscores.
 */
export function truncateTransform(options: {
	fileSystemMaxLength: number
	maxLength: number
	truncateOnWordBoundary: boolean
	truncationString: string
}): Transform {
	return async (context) => {
		// TODO increment-aware truncation?
		const { fileSystemMaxLength, maxLength, truncateOnWordBoundary, truncationString } = options

		return truncate(
			context.filePath.name,
			maxLength - context.filePath.ext.length,
			fileSystemMaxLength,
			truncateOnWordBoundary,
			truncationString,
		)
	}
}

/**
 * Removes increment like (1) from the filename
 */
export function stripIncrementTransform(): Transform {
	return async (context) => stripIncrement(context.filePath.name)
}

/**
 * Converts the filename to a different case
 */
export function caseTransform(caseType: CaseType): Transform {
	return async (context) => convertCase(context.filePath.name, caseType)
}
