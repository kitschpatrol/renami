import escapeStringRegexp from 'escape-string-regexp'
import filenamify from 'filenamify'
import { slug } from 'github-slugger'

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
	if ([' ', ',', '-', '.', ':', '_', '|'].includes(current)) {
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
 * @param trim - Whether to trim leading and trailing white space (before the truncation string is appended)
 * @param truncationString - The string to append after truncation (e.g., "...")
 * @returns The truncated string with the truncation string appended if truncation occurred
 */
export function truncate(
	text: string,
	maxLength: number,
	fileSystemMaxLength: number,
	truncateOnWordBoundary: boolean,
	trim: boolean,
	truncationString = '...',
): string {
	// If the truncation string is longer than either max length, we can't proceed sensibly
	if (truncationString.length > Math.min(maxLength, fileSystemMaxLength)) {
		const result = truncationString.slice(0, Math.min(maxLength, fileSystemMaxLength))
		return trim ? result.trim() : result
	}

	// Calculate available length for the content before appending truncation string
	const effectiveMaxLength = Math.min(maxLength, fileSystemMaxLength)
	const safeMaxLength = effectiveMaxLength - truncationString.length

	// No need to truncate if the text is already short enough
	if (text.length <= effectiveMaxLength) {
		return trim ? text.trim() : text
	}

	// If we can't fit any content plus the truncation string, return just the truncation string
	if (safeMaxLength <= 0) {
		const result = truncationString.slice(0, effectiveMaxLength)
		return trim ? result.trim() : result
	}

	// If we don't need to respect word boundaries, simple slice
	if (!truncateOnWordBoundary) {
		const result = text.slice(0, safeMaxLength)
		return (trim ? result.trim() : result) + truncationString
	}

	// Look backwards from safeMaxLength to find a boundary
	let boundary = safeMaxLength
	for (let i = safeMaxLength; i > 0; i--) {
		if (isWordBoundary(text, i)) {
			// Skip multiple adjacent boundary characters
			// (e.g., for text like "word, next" we want "word" not "word,")
			boundary = i
			// Keep moving back until we find a non-boundary character
			while (boundary > 0 && isWordBoundary(text, boundary)) {
				boundary--
			}
			// Now we're on the last character of the word, so add 1 to include it
			boundary++
			break
		}
	}

	// If we couldn't find a boundary within a reasonable range, use the original cut point
	const result = text.slice(0, boundary)
	return (trim ? result.trim() : result) + truncationString
}

/**
 * Converts empty strings to undefined
 * @param text - The input value to check
 * @returns The input value if it is not an empty string, otherwise undefined
 * @public
 */
export function emptyIsUndefined(text?: string): string | undefined {
	if (text === undefined) {
		return undefined
	}

	return text.trim() === '' ? undefined : text
}

/**
 * Removes leading indentation from template literals.
 *
 * This function trims consistent leading whitespace from multiline template strings,
 * making it easier to include properly formatted text in code without having to
 * manually remove indentation.
 * @param strings - Template string array from a tagged template literal
 * @param values - Values interpolated into the template string
 * @returns A string with consistent leading indentation removed from each line
 * @public
 */
export function trimLeadingIndentation(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	// Combine template parts and values into a single string.
	// eslint-disable-next-line ts/restrict-plus-operands, ts/no-base-to-string
	let raw = strings.reduce((acc, part, i) => acc + part + (values[i] ?? ''), '')

	// Normalize tabs to two spaces.
	raw = raw.replaceAll('\t', '  ')

	// Split into lines.
	const lines = raw.split(/\r?\n/)

	// Remove leading/trailing blank lines.
	while (lines.length > 0 && lines[0].trim() === '') {
		lines.shift()
	}
	while (lines.length > 0 && lines.at(-1)?.trim() === '') {
		lines.pop()
	}

	// Determine the minimum indentation across non-blank lines.
	let minIndent = Infinity
	for (const line of lines) {
		if (line.trim() === '') continue
		// eslint-disable-next-line regexp/no-unused-capturing-group
		const match = /^( *)/.exec(line)
		if (match) {
			minIndent = Math.min(minIndent, match[0].length)
		}
	}
	if (minIndent === Infinity) {
		minIndent = 0
	}

	// Remove the common indent from each line.
	const trimmedLines = lines.map((line) => line.slice(minIndent))
	return trimmedLines.join('\n')
}

/**
 * Converts a string to an array of Unicode code points in hexadecimal format.
 *
 * Currently used for testing only
 *
 * This function takes a string and returns an array where each element is the
 * hexadecimal representation of the corresponding Unicode code point in the original string.
 * Uses Intl.Segmenter for proper handling of grapheme clusters (emojis, combined characters).
 * @param text - The input string to convert to Unicode code points
 * @returns An array of strings, each representing a Unicode code point in hexadecimal format
 */
export function getUnicodeCodePoints(text: string): string[] {
	const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
	const segments = segmenter.segment(text)
	const codePoints: string[] = []

	for (const { segment } of segments) {
		// Iterate over each code point in the grapheme cluster.
		for (const char of segment) {
			const cp = char.codePointAt(0)!
			codePoints.push(cp.toString(16))
		}
	}
	return codePoints
}

export const CASE_TYPE_NAMES = [
	'camel',
	'kebab',
	'lowercase',
	'pascal',
	'preserve',
	'screaming-kebab',
	'screaming-snake',
	'sentence',
	'slug',
	'snake',
	'title',
	'uppercase',
] as const

export type CaseType = (typeof CASE_TYPE_NAMES)[number]

/**
 * Converts a string to the specified case format
 *
 * Also look at: https://unjs.io/packages/scule
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

		case 'slug': {
			return slug(text, false)
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

/**
 * Ensures that the filename is filesystem-safe and Unicode normalized
 * @param text Text to be converted to a safe filename, just the extension-less name NOT the full path
 * @param defaultEmptyFilename Default filename to use if the text is empty or all whitespace
 * @param preserveTrailingPeriods Whether to preserve trailing periods in the
 * filename, technically reserve on Windows... single periods are still
 * stripped.
 * @returns A safe filename
 */
export function getSafeFilename(
	text: string,
	defaultEmptyFilename = 'Untitled',
	preserveTrailingPeriods = true,
): string {
	let basicSafeFilename = filenamify(text, {
		maxLength: Number.MAX_SAFE_INTEGER,
		replacement: ' ',
	})

	if (preserveTrailingPeriods) {
		// Get trailing periods from original text
		const trailingPeriods = /\.{2,}$/.exec(text)
		if (trailingPeriods) {
			// Append the trailing periods to the safe filename
			basicSafeFilename = `${basicSafeFilename}${trailingPeriods[0]}`
		}
	}

	// Edge case where the filename is empty or all whitespace after invalid characters are removed
	if (basicSafeFilename.trim().length === 0) {
		basicSafeFilename = defaultEmptyFilename
	}

	// Unicode normalization
	// https://github.com/kitschpatrol/yanki-obsidian/issues/13
	basicSafeFilename = basicSafeFilename.normalize('NFC')

	return basicSafeFilename
}

/**
 * Strip the trailing increment from a filename
 * @param filename Filename only, without an extension
 * @returns filename without the increment
 */
export function stripIncrement(filename: string): string {
	return filename.replace(/\s\(\d+\)$/, '')
}

/**
 * Strip the trailing increment from a filename
 * @param filename Filename only, without an extension
 * @returns filename with the increment
 */
export function appendIncrement(filename: string, index: number): string {
	return `${filename} (${index})`
}

/**
 * Get the increment from a filename as a number
 * @param filename Filename only, without an extension
 * @returns The increment as a number, or undefined if there is no increment
 */
export function getIncrement(filename: string): number | undefined {
	const match = /\s\((\d+)\)$/.exec(filename)
	if (match) {
		return Number.parseInt(match[1], 10)
	}
	return undefined
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @param strings - Template string array from a tagged template literal
 * @param values - Values interpolated into the template string
 * @returns A string which will be formatted correctly by prettier
 * @public
 */
export function markdown(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @param strings - Template string array from a tagged template literal
 * @param values - Values interpolated into the template string
 * @returns A string which will be formatted correctly by prettier
 * @public
 */
export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @param strings - Template string array from a tagged template literal
 * @param values - Values interpolated into the template string
 * @returns A string which will be formatted correctly by prettier
 * @public
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Mainly for nice formatting with prettier. But the line wrapping means we have to strip surplus whitespace.
 * @param strings - Template string array from a tagged template literal
 * @param values - Values interpolated into the template string
 * @returns A string which will be formatted correctly by prettier
 * @public
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
	return trimLeadingIndentation(strings, ...values)
}

/**
 * Strip surplus delimiters from a string
 */
export function collapseSurplusDelimiters(text: string, delimiter: string) {
	if (delimiter.length === 0 || !text.includes(delimiter)) {
		return text
	}

	let newText = text

	// Leading, possibly with extra leading spaces
	newText = newText.replaceAll(new RegExp(`^\\s*(${escapeStringRegexp(delimiter)}){1,}`, 'g'), '')

	// Trailing, possibly with extra trailing spaces
	newText = newText.replaceAll(new RegExp(`(${escapeStringRegexp(delimiter)}){1,}\\s*$`, 'g'), '')
	// NewText = newText.replace(new RegExp(`${escapeStringRegexp(delimiter)}\\s*$`), '')

	// Middle
	newText = newText.replaceAll(new RegExp(`(${escapeStringRegexp(delimiter)}){2,}`, 'g'), delimiter)

	return newText
}

/**
 * Collapse multiple spaces into a single space
 */
export function collapseDuplicateSpaces(text: string): string {
	return text.replaceAll(/\s+/g, ' ')
}
