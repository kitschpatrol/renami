import is from '@sindresorhus/is'
import { format as formatDate } from 'date-fns'
import { type Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { format as formatNumber } from 'numerable'
import propertyExpr from 'property-expr'
import { select } from 'unist-util-select'
import { isNumerableFormatString } from '../string'
import { interpolate, type InterpolationContext } from './core'

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
 * Function to format a value based on a format string
 * @param value - The value to format
 * @param formatString - Optional format string
 * @returns - Formatted string
 */

function formatValue(value: unknown, formatString?: string): string {
	if (!formatString || formatString.trim() === '') {
		return emptyCollectionToString(value)
	}

	// Try to format as a number using numerable
	if ((is.number(value) || is.numericString(value)) && isNumerableFormatString(formatString)) {
		// Convert to number

		const numberValue = is.string(value) ? Number.parseFloat(value) : value

		if (!is.nan(numberValue)) {
			// TODO what if invalid?
			return formatNumber(numberValue, formatString)
		}
	}

	// Try to format as a date
	const dateValue = is.date(value) ? value : new Date(String(value))
	if (is.validDate(dateValue)) {
		const result = formatDate(dateValue, formatString)
		// Invalid format strings return themselves...
		if (result !== formatString) {
			return result
		}
	}

	// TODO other formatting treats?

	// Return as-is if no formatting succeeded
	return emptyCollectionToString(value)
}

/**
 * Interpolates a template string with metadata and AST tree
 * @param template - The template string to process
 * @param metadata - Object containing metadata for single-brace interpolation
 * @param tree - Unified AST for double-brace query interpolation
 * @returns - The processed string with interpolations replaced
 */
export function interpolateDocument(
	template: string,
	metadata: Record<string, unknown>,
	tree: Root,
): string {
	return interpolate(template, (context: InterpolationContext) => {
		const { braceCount, pipeValue, value } = context

		// Handle different brace counts
		if (braceCount === 1) {
			// Single braces: object accessor using object-path
			// This is the only library that seems to handle everything correctly
			// (except "." characters in the key...)
			const getter = propertyExpr.getter(value, true)
			const resolvedValue = getter(metadata) as unknown

			return formatValue(resolvedValue, pipeValue)
		}
		if (braceCount === 2) {
			// Double braces: AST selector using mdast-util-to-string
			try {
				const selected = select(value, tree)
				const extractedValue = selected === undefined ? '' : toString(selected)
				return formatValue(extractedValue, pipeValue)
			} catch {
				// Return empty string if selection fails
				return ''
			}
		}
		if (braceCount === 3) {
			// Triple braces: Not implemented in this version
			// Return empty string as specified
			return ''
		}

		return ''
	})
}

// Re-export the core interpolate function
export { interpolate } from './core'
export type { InterpolationContext } from './core'
