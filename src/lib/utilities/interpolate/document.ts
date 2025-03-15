import { NumberFormatter } from '@internationalized/number'
import { format as formatDate } from 'date-fns'
import { getProperty } from 'dot-prop'
import { type Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { select } from 'unist-util-select'
import { interpolate, type InterpolationContext } from './core'

/**
 * Function to format a value based on a format string
 * @param value - The value to format
 * @param formatString - Optional format string
 * @returns - Formatted string
 */
function formatValue(value: unknown, formatString?: string): string {
	if (!formatString || formatString.trim() === '') {
		// eslint-disable-next-line ts/no-base-to-string
		return String(value ?? '')
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

	// Try to format as a number
	try {
		const numberValue = typeof value === 'string' ? Number.parseFloat(value) : value

		if (typeof numberValue === 'number' && !Number.isNaN(numberValue)) {
			console.log('----------------------------------')
			console.log(value)
			console.log(numberValue)
			console.log(formatString)

			const formatter = new NumberFormatter(formatString)
			return formatter.format(numberValue)
		}
	} catch {
		// Not a valid number format, return as-is
	}

	// Return as-is if no formatting succeeded
	// eslint-disable-next-line ts/no-base-to-string
	return String(value ?? '')
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
			// Single braces: object accessor using dot-prop
			const resolvedValue = getProperty(metadata, value, '')
			return formatValue(resolvedValue, pipeValue)
		}
		if (braceCount === 2) {
			// Double braces: AST selector using mdast-util-to-string
			const selected = select(value, tree)
			const extractedValue = selected === undefined ? '' : toString(selected)
			return formatValue(extractedValue, pipeValue)
		}
		if (braceCount === 3) {
			// Triple braces: Not implemented in this version
			// Return empty string as specified
			return ''
		}

		return ''
	})
}
