import { NumberFormat } from '@formatjs/intl-numberformat'
import { format as formatDate } from 'date-fns'
import { getProperty } from 'dot-prop'
import { type Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { select } from 'unist-util-select'
import { interpolate, type InterpolationContext } from './core'

/**
 * Helper to convert array or object to empty string
 * @param value - The value to convert to string if it's a primitive
 * @returns - Empty string for arrays/objects, string representation for primitives
 */
function emptyCollectionToString(value: unknown): string {
	if (value === null || value === undefined) {
		return ''
	}

	if (Array.isArray(value) && value.length === 0) {
		return ''
	}

	if (typeof value === 'object' && Object.keys(value).length === 0) {
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

	// Try to format as a date
	try {
		const dateValue = value instanceof Date ? value : new Date(String(value))
		if (!Number.isNaN(dateValue.getTime())) {
			return formatDate(dateValue, formatString)
		}
	} catch {
		// Not a valid date, continue to number formatting
	}

	// Try to format as a number using @formatjs/intl-numberformat
	try {
		const numberValue = typeof value === 'string' ? Number.parseFloat(value) : value
		if (typeof numberValue === 'number' && !Number.isNaN(numberValue)) {
			// Use @formatjs/intl-numberformat to format numbers according to TR35 skeletons
			try {
				// Create a number formatter with the appropriate options
				const numberFormat = new NumberFormat(undefined, {
					maximumFractionDigits:
						formatString === 'integer'
							? 0
							: formatString.startsWith('.')
								? Number.parseInt(formatString.slice(1), 10)
								: undefined,
					minimumFractionDigits:
						formatString === 'decimal'
							? 1
							: formatString.startsWith('.')
								? Number.parseInt(formatString.slice(1), 10)
								: undefined,
					notation: formatString === 'scientific' ? 'scientific' : 'standard',
					style: 'decimal',
				})
				return numberFormat.format(numberValue)
			} catch {
				// If NumberFormat fails, fall back to built-in Intl.NumberFormat
				return new Intl.NumberFormat().format(numberValue)
			}
		}
	} catch {
		// Not a valid number format, return as-is
	}

	// Return as-is if no formatting succeeded
	return emptyCollectionToString(value)
}

/**
 * Custom property getter that handles bracket notation with quotes
 * @param object - Object to get property from
 * @param path - Property path with possible quoted segments
 * @returns - The value at the path or empty string if not found
 */
function customPropertyGetter(object: Record<string, unknown>, path: string): unknown {
	// Check if we're using bracket notation with quotes
	const doubleBracketMatch = /^(.+?)\["(.+?)"\]$/.exec(path)
	const singleBracketMatch = /^(.+?)\['(.+?)'\]$/.exec(path)

	if (doubleBracketMatch ?? singleBracketMatch) {
		const bracketMatch = doubleBracketMatch ?? singleBracketMatch
		if (!bracketMatch) return ''

		const [, objectPath, propName] = bracketMatch

		// eslint-disable-next-line ts/no-confusing-void-expression
		const targetObject = objectPath ? getProperty(object, objectPath) : object
		return targetObject && typeof targetObject === 'object' ? targetObject[propName] : ''
	}

	// Regular dot-prop getter
	return getProperty(object, path, '')
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
			// Single braces: object accessor using dot-prop or custom property getter
			try {
				const resolvedValue = customPropertyGetter(metadata, value)
				return formatValue(resolvedValue, pipeValue)
			} catch {
				// Return empty string if property access fails
				return ''
			}
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
