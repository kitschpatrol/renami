/* eslint-disable ts/require-await */

import { z } from 'zod'
import type { FileAdapter } from './utilities/file'
import type { PathObject } from './utilities/path'
import type { CaseType } from './utilities/string'
import { FileAdapterSchema } from './utilities/file'
import { PathObjectSchema } from './utilities/path'
import {
	collapseDuplicateSpaces,
	collapseSurplusDelimiters,
	convertCase,
	getSafeFilename,
	stripIncrement,
	truncate,
} from './utilities/string'

/**
 * Can return either JUST the filename, with no path or extension, OR a PathObject...
 * If it returns undefined, the next action will be used
 */
export type Transform = (context: {
	fileAdapter: FileAdapter
	filePath: PathObject
}) => Promise<PathObject | string | undefined>

/**
 * Zod schema for Transform function, satisfies instead of infers for cleaner type intellisense.
 */
export const TransformSchema = z
	.function()
	.args(
		z.object({
			fileAdapter: FileAdapterSchema,
			filePath: PathObjectSchema,
		}),
	)
	.returns(
		z.promise(z.union([PathObjectSchema, z.string(), z.undefined()])),
	) satisfies z.ZodType<Transform>

/**
 * Collapses surplus delimiters (i.e. two or more consecutive delimiters)
 * into a single space, then removes any delimiter tokens at the boundaries.
 * When only a single delimiter occurs, its surrounding whitespace is preserved.
 * @param delimiter - Array of delimiters to collapse (only the first is used)
 */
export function collapseSurplusDelimitersTransform(delimiter: string): Transform {
	return async (context) => collapseSurplusDelimiters(context.filePath.name, delimiter)
}

/**
 * Collapses duplicate whitespace into a single space
 */
export function collapseWhitespaceTransform(): Transform {
	return async (context) => collapseDuplicateSpaces(context.filePath.name)
}

/**
 * Trims leading and trailing whitespace
 */
export function trimTransform(): Transform {
	return async (context) => context.filePath.name.trim()
}

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
	trim: boolean
	truncateOnWordBoundary: boolean
	truncationString: string
}): Transform {
	return async (context) => {
		// TODO increment-aware truncation?
		const { fileSystemMaxLength, maxLength, trim, truncateOnWordBoundary, truncationString } =
			options

		return truncate(
			context.filePath.name,
			maxLength - context.filePath.ext.length,
			fileSystemMaxLength,
			truncateOnWordBoundary,
			trim,
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
