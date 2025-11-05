import is from '@sindresorhus/is'
import type { Options } from '../config'
import type { CaseType } from './string'
import { defaultOptions } from '../config'
import { formatDate } from './date'
import { formatNumber } from './number'
import { FILENAME_MAX_LENGTH } from './platform'
import { CASE_TYPE_NAMES, convertCase, truncate } from './string'

/**
 * Shadows Options
 * @public
 */
export type FormatOptions = Pick<
	Options,
	'locale' | 'timeZone' | 'trim' | 'truncateOnWordBoundary' | 'truncationString'
>

const defaultFormatOptions: FormatOptions = {
	locale: defaultOptions.locale,
	timeZone: defaultOptions.timeZone,
	trim: defaultOptions.trim,
	truncateOnWordBoundary: defaultOptions.truncateOnWordBoundary,
	truncationString: defaultOptions.truncationString,
}

/**
 * Helper to convert array or object to empty string
 * @param value - The value to convert to string if it's a primitive
 * @returns - Empty string for arrays/objects, string representation for primitives
 */
function emptyCollectionToString(value: unknown): string {
	if (
		is.nullOrUndefined(value) ||
		is.emptyArray(value) ||
		is.emptyObject(value) ||
		is.symbol(value)
	) {
		// Return empty string for null, undefined, empty array, empty object, or symbol
		return ''
	}

	// eslint-disable-next-line ts/no-base-to-string
	return String(value)
}

/**
 * Function to format a value based on a format string or an array of format strings
 * @param value - The value to format
 * @param format - Optional format string or array of format strings to be chained in series
 * @param options - Optional config options which can affect things like truncation and time zones
 * @returns - Formatted string
 */
export function formatValue(
	value: unknown,
	format?: string | string[],
	options?: FormatOptions,
): string {
	if (is.nullOrUndefined(format) || is.emptyArray(format) || is.emptyStringOrWhitespace(format)) {
		return emptyCollectionToString(value)
	}

	const resolvedOptions = {
		...defaultFormatOptions,
		...options,
	}

	// Handle array of format strings by recursively applying each format
	if (is.array(format)) {
		// Apply each format string in sequence
		let result = value
		for (const aFormat of format) {
			result = formatValue(result, aFormat, resolvedOptions)
		}

		return String(result)
	}

	// -------------------------------

	// Format implementations...

	// Case change
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	if (is.nonEmptyString(value) && CASE_TYPE_NAMES.includes(format.toLowerCase() as CaseType)) {
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		return convertCase(value, format as CaseType)
	}

	// Format number
	// e.g. 'I have {count|0,0.00}'
	try {
		return formatNumber(value, format)
	} catch {
		// Ignore errors and try the next format
	}

	// Format date
	// e.g. 'Happy {birthday|YYYY-MM-DD}'

	try {
		return formatDate(value, format, options?.timeZone, options?.locale)
	} catch {
		// Ignore errors and try the next format
	}

	// At this point, Convert to string if value is not a string
	const stringValue = emptyCollectionToString(value)

	// Truncate strings if format is a number string
	// Collides with the single-character number format string `0`, which
	// will be taken by NumberFormatter since zero-length truncation doesn't make sense
	// e.g. 'I love {name|10}'
	if (is.nonEmptyString(stringValue) && format.length < 4) {
		const maxLength = Number.parseInt(format, 10)
		if (is.safeInteger(maxLength) && maxLength >= 1 && maxLength < 1000) {
			return truncate(
				stringValue,
				maxLength,
				FILENAME_MAX_LENGTH,
				resolvedOptions.truncateOnWordBoundary,
				resolvedOptions.trim,
				resolvedOptions.truncationString,
			)
		}
	}

	// TODO other formatting treats?

	// Return as-is if no formatting succeeded
	return stringValue
}
