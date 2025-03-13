/* eslint-disable jsdoc/require-jsdoc */

export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Determines if a position in a string is a word boundary.
 * @param text - The string to check
 * @param index - The position in the string to check
 * @returns Whether the position is a word boundary
 */
function isWordBoundary(text: string, index: number): boolean {
	if (index <= 0 || index >= text.length) return false

	const previous = text.charAt(index - 1)
	const current = text.charAt(index)

	// If the current character is a delimiter, use this as a boundary
	if ([' ', '-', '.', '_'].includes(current)) {
		return true
	}

	// Check for camelCase boundary: previous is lowercase letter/digit and current is uppercase
	if (/[a-z0-9]/.test(previous) && /[A-Z]/.test(current)) {
		return true
	}

	return false
}

/**
 * Truncates a string to a specified maximum length, optionally respecting word boundaries.
 * @param text - The string to truncate
 * @param maxLength - The maximum desired length of the result (including truncation string)
 * @param fileSystemMaxLength - The absolute maximum length permitted (e.g., by a file system)
 * @param truncateOnWordBoundary - Whether to truncate at a word boundary
 * @param truncationString - The string to append after truncation (e.g., "...")
 * @returns The truncated string with the truncation string appended if truncation occurred
 */
export function truncate(
	text: string,
	maxLength: number,
	fileSystemMaxLength: number,
	truncateOnWordBoundary: boolean,
	truncationString = '...',
): string {
	// Input validation removed as requested

	// If the truncation string is longer than either max length, we can't proceed sensibly
	if (truncationString.length > Math.min(maxLength, fileSystemMaxLength)) {
		return truncationString.slice(0, Math.min(maxLength, fileSystemMaxLength))
	}

	// Calculate available length for the content before appending truncation string
	const effectiveMaxLength = Math.min(maxLength, fileSystemMaxLength)
	const safeMaxLength = effectiveMaxLength - truncationString.length

	// No need to truncate if the text is already short enough
	if (text.length <= effectiveMaxLength) {
		return text
	}

	// If we can't fit any content plus the truncation string, return just the truncation string
	if (safeMaxLength <= 0) {
		return truncationString.slice(0, effectiveMaxLength)
	}

	// If we don't need to respect word boundaries, simple slice
	if (!truncateOnWordBoundary) {
		return text.slice(0, safeMaxLength) + truncationString
	}

	// Look backwards from safeMaxLength to find a boundary
	let boundary = safeMaxLength
	const searchRange = Math.min(30, Math.floor(safeMaxLength / 2)) // Limit search to reasonable range

	for (let i = safeMaxLength; i > safeMaxLength - searchRange && i > 0; i--) {
		if (isWordBoundary(text, i)) {
			boundary = i
			break
		}
	}

	// If we couldn't find a boundary within a reasonable range, use the original cut point
	return text.slice(0, boundary) + truncationString
}

export function emptyIsUndefined(text: string | undefined): string | undefined {
	if (text === undefined) {
		return undefined
	}

	return text.trim() === '' ? undefined : text
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @public
 */
export function markdown(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @public
 */
export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @public
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @public
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

function trimLeadingIndentation(strings: TemplateStringsArray, ...values: unknown[]): string {
	const lines = strings
		// eslint-disable-next-line unicorn/no-array-reduce, ts/no-base-to-string
		.reduce((result, text, i) => `${result}${text}${String(values[i] ?? '')}`, '')
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '')

	// Get leading white space of first line, and trim that much white space
	// from subsequent lines
	// eslint-disable-next-line regexp/no-unused-capturing-group
	const leadingSpace = /^(\s+)/.exec(lines[0])?.[0] ?? ''
	const leadingSpaceRegex = new RegExp(`^${leadingSpace}`)
	return lines.map((line) => line.replace(leadingSpaceRegex, '').trimEnd()).join('\n')
}

export function splitAtFirstMatch(text: string, regex: RegExp): [string, string | undefined] {
	// Find the first match of the regex
	const match = text.match(regex)

	if (match?.index === undefined) {
		return [text, undefined] // If no match is found, return the whole string and an empty string
	}

	// Get the position and length of the first match
	const { index } = match

	// Split the string into two parts
	const beforeMatch = text.slice(0, index)
	const afterMatch = text.slice(index)

	return [beforeMatch, afterMatch]
}

export function getUnicodeCodePoints(text: string): string[] {
	// eslint-disable-next-line ts/no-misused-spread
	return [...text].map((char) => char.codePointAt(0)!.toString(16))
}

export type CaseType =
	| 'camel'
	| 'kebab'
	| 'lowercase'
	| 'pascal'
	| 'preserve'
	| 'screaming-kebab'
	| 'screaming-snake'
	| 'sentence'
	| 'snake'
	| 'title'
	| 'uppercase'

/**
 * Converts a string to the specified case format
 * @param text - The input string to convert
 * @param caseType - The case format to convert to
 * @returns The converted string in the specified case format
 */
export function convertCase(text: string, caseType: CaseType): string {
	// Handle empty strings
	if (!text) return text

	// Early return for preserve case
	if (caseType === 'preserve') return text

	// Early optimization for simple full-string transforms
	if (caseType === 'lowercase') return text.toLowerCase()
	if (caseType === 'uppercase') return text.toUpperCase()

	// More robust word separation that detects camelCase and PascalCase
	// as well as the usual delimiters
	const words = text
		// Insert a space before any uppercase letter that follows a lowercase letter or number
		.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
		// Split on common delimiters and remove empty entries
		.split(/[\s\-_]+/)
		.filter((word) => word.length > 0)

	switch (caseType) {
		case 'camel': {
			return words
				.map((word, index) => {
					if (index === 0) {
						return word.toLowerCase()
					}
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
				})
				.join('')
		}

		case 'kebab': {
			return words.map((word) => word.toLowerCase()).join('-')
		}

		case 'pascal': {
			return words
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
				.join('')
		}

		case 'screaming-kebab': {
			return words.map((word) => word.toUpperCase()).join('-')
		}

		case 'screaming-snake': {
			return words.map((word) => word.toUpperCase()).join('_')
		}

		case 'sentence': {
			if (words.length === 0) {
				// If there are no words but there is text, attempt to capitalize the first letter
				return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
			}

			// For sentence case, capitalize first word, lowercase the rest
			return words
				.map((word, index) => {
					if (index === 0) {
						return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
					}
					return word.toLowerCase()
				})
				.join(' ')
		}

		case 'snake': {
			return words.map((word) => word.toLowerCase()).join('_')
		}

		case 'title': {
			// Improved to not capitalize certain small words, unless they're first or last
			const smallWords = new Set([
				'a',
				'an',
				'and',
				'as',
				'at',
				'but',
				'by',
				'for',
				'if',
				'in',
				'nor',
				'of',
				'on',
				'or',
				'so',
				'the',
				'to',
				'up',
				'yet',
			])

			return words
				.map((word, index) => {
					const lowerWord = word.toLowerCase()
					// Always capitalize first and last words, and longer words
					if (index === 0 || index === words.length - 1 || !smallWords.has(lowerWord)) {
						return word.charAt(0).toUpperCase() + lowerWord.slice(1)
					}
					return lowerWord
				})
				.join(' ')
		}
	}
}
