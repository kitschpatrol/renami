import is from '@sindresorhus/is'
import type { CaseType } from './string'
import { formatDate } from './date'
import { formatNumber } from './number'
import { FILENAME_MAX_LENGTH } from './platform'
import { CASE_TYPE_NAMES, convertCase, truncate } from './string'

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
 * @returns - Formatted string
 */
export function formatValue(value: unknown, format?: string | string[]): string {
	if (is.nullOrUndefined(format) || is.emptyArray(format) || is.emptyStringOrWhitespace(format)) {
		return emptyCollectionToString(value)
	}

	// Handle array of format strings by recursively applying each format
	if (is.array(format)) {
		// Apply each format string in sequence
		let result = value
		for (const aFormat of format) {
			result = formatValue(result, aFormat)
		}

		return String(result)
	}

	// -------------------------------

	// Format implementations...

	// Case change
	if (is.nonEmptyString(value) && CASE_TYPE_NAMES.includes(format.toLowerCase() as CaseType)) {
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
		return formatDate(value, format)
	} catch {
		// Ignore errors and try the next format
	}

	// Truncate strings if format is a number string
	// Collides with the single-character number format string `0`
	// e.g. 'I love {name|10}'
	if (is.nonEmptyString(value) && format.length < 4) {
		const maxLength = Number.parseInt(format, 10)
		if (is.safeInteger(maxLength) && maxLength >= 1 && maxLength < 1000) {
			return truncate(String(value), maxLength, FILENAME_MAX_LENGTH, true, false, '')
		}
	}

	// TODO other formatting treats?

	// Return as-is if no formatting succeeded
	return emptyCollectionToString(value)
}
