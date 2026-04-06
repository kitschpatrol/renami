import is from '@sindresorhus/is'
import { format as numerableFormat } from 'numerable'

const NUMERABLE_ALLOWED_CHARS_REGEX = /^[0()[\],.+#X$\s:\-%abdo]*$/

/**
 * Try to format an unknown value as a number using numerable
 *
 * @param value - Any value which might actually be a number
 * @param format - Numerable format string, will be validated
 *
 * @returns String
 * @throws {Error} If the number could not be formatted
 * @see https://github.com/gastonmesseri/numerable#1234-formatting-numbers
 */
export function formatNumber(value: unknown, format: string): string {
	// Validate
	if (!is.number(value) && !is.numericString(value)) {
		throw new Error(`Invalid number: ${String(value)}`)
	}

	if (!isNumerableFormatString(format)) {
		throw new Error(`Invalid number format string: ${format}`)
	}

	// Convert to number
	const numberValue = is.string(value) ? Number.parseFloat(value) : value

	if (is.nan(numberValue)) {
		throw new Error(`Invalid number conversion: ${String(value)}`)
	}

	// TODO what if invalid?
	return numerableFormat(numberValue, format)
}

/**
 * Check if a string is a valid numerable format string
 *
 * @see https://github.com/gastonmesseri/numerable#1234-formatting-numbers
 */
// eslint-disable-next-line complexity
export function isNumerableFormatString(input: string): boolean {
	// Must contain at least one '0'
	if (!input.includes('0')) {
		return false
	}

	// Check ending patterns
	const trimmedInput = input.trim().toLowerCase()
	if (
		// eslint-disable-next-line de-morgan/no-negated-disjunction
		!(
			trimmedInput.endsWith('bb') ||
			trimmedInput.endsWith('bd') ||
			trimmedInput.endsWith('%') ||
			trimmedInput.endsWith('o') ||
			trimmedInput.endsWith('$') ||
			trimmedInput.endsWith('x') ||
			trimmedInput.endsWith('#') ||
			trimmedInput.endsWith('a') ||
			trimmedInput.endsWith('-') ||
			trimmedInput.endsWith('+') ||
			trimmedInput.endsWith('0') ||
			trimmedInput.endsWith(')') ||
			trimmedInput.endsWith(']')
		)
	) {
		return false
	}

	// Check for allowed characters first (early return for better performance)
	if (!NUMERABLE_ALLOWED_CHARS_REGEX.test(input)) {
		return false
	}

	// Check balanced parentheses/brackets
	const openParenCount = (input.match(/\(/g) ?? []).length
	const closeParenCount = (input.match(/\)/g) ?? []).length
	const openBracketCount = (input.match(/\[/g) ?? []).length
	const closeBracketCount = (input.match(/\]/g) ?? []).length

	// Must have balanced parentheses and brackets
	const hasValidParentheses = openParenCount === closeParenCount
	const hasValidBrackets = openBracketCount === closeBracketCount

	if (!hasValidParentheses || !hasValidBrackets) {
		return false
	}

	return true
}
