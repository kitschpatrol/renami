/* eslint-disable max-depth */
import { createToken } from 'chevrotain'

// Define the token types for our template language
const allTokens = []

// Tokens for single, double, and triple braces
const OpenTripleBrace = createToken({ name: 'OpenTripleBrace', pattern: /\{\{\{/ })
const CloseTripleBrace = createToken({ name: 'CloseTripleBrace', pattern: /\}\}\}/ })
const OpenDoubleBrace = createToken({ name: 'OpenDoubleBrace', pattern: /\{\{/ })
const CloseDoubleBrace = createToken({ name: 'CloseDoubleBrace', pattern: /\}\}/ })
const OpenBrace = createToken({ name: 'OpenBrace', pattern: /\{/ })
const CloseBrace = createToken({ name: 'CloseBrace', pattern: /\}/ })

// Token for format separator
const Pipe = createToken({ name: 'Pipe', pattern: /\|/ })

// Escape character
const EscapeChar = createToken({ name: 'EscapeChar', pattern: /\\/ })

// Content inside braces
const BraceContent = createToken({
	name: 'BraceContent',
	pattern: /[^}|]+/,
})

// Format string after pipe
const FormatString = createToken({
	name: 'FormatString',
	pattern: /[^}]+/,
})

// Text content outside of braces
const Text = createToken({
	name: 'Text',
	pattern: /[^{\\]+/,
})

// Add tokens to the array in order of priority
allTokens.push(
	OpenTripleBrace, // Order matters! Check for triple braces before double braces
	CloseTripleBrace,
	OpenDoubleBrace, // Check for double braces before single braces
	CloseDoubleBrace,
	OpenBrace,
	CloseBrace,
	Pipe,
	BraceContent,
	FormatString,
	EscapeChar,
	Text,
)

// Note: We're keeping Chevrotain and the token definitions in case
// we want to use them for more complex parsing in the future, but
// the current implementation uses direct string parsing.

// Interface for the interpolation handler
export type InterpolationContext = {
	braceCount: number // 1, 2, or 3 depending on brace quantity
	pipeValue?: string // Raw string of content after the pipe, or undefined if no pipe
	value: string // Raw string from inside the braces
}

/**
 * Finds the matching closing brace, accounting for nested braces
 * @param template - The template string
 * @param startIndex - The starting index to search from
 * @param openBrace - The opening brace pattern to match ('{', '{{', or '{{{')
 * @param closeBrace - The closing brace pattern to match ('}', '}}', or '}}}')
 * @returns The index of the matching closing brace, or -1 if not found
 */
function findMatchingClosingBrace(
	template: string,
	startIndex: number,
	openBrace: string,
	closeBrace: string,
): number {
	let depth = 1
	let i = startIndex

	while (i < template.length) {
		// Check for escaped characters
		if (template[i] === '\\' && i + 1 < template.length) {
			i += 2
			continue
		}

		// Check for opening brace sequence
		if (
			i + openBrace.length <= template.length &&
			template.slice(i, i + openBrace.length) === openBrace
		) {
			depth++
			i += openBrace.length
			continue
		}

		// Check for closing brace sequence
		if (
			i + closeBrace.length <= template.length &&
			template.slice(i, i + closeBrace.length) === closeBrace
		) {
			depth--
			if (depth === 0) {
				return i
			}
			i += closeBrace.length
			continue
		}

		// Move to next character
		i++
	}

	return -1 // No matching closing brace found
}

/**
 * Core interpolation function that processes templates with callback-based handling
 * @param template - The template string to process
 * @param handler - Callback function that processes each interpolation
 * @returns - The processed string with interpolations replaced
 */
// eslint-disable-next-line complexity
export function interpolate(
	template: string,
	handler: (context: InterpolationContext) => string,
): string {
	let result = ''
	let i = 0

	// Process the template character by character with a custom approach
	while (i < template.length) {
		// Check for escape sequences first
		if (template[i] === '\\' && i + 1 < template.length) {
			// Only treat backslash as escape for brace characters, pipe, or another backslash
			const nextChar = template[i + 1]
			if (nextChar === '{' || nextChar === '}' || nextChar === '\\' || nextChar === '|') {
				result += nextChar
				i += 2
				continue
			}
			// Otherwise, treat the backslash as a regular character
			result += '\\'
			i++
			continue
		}

		// Check for triple braces
		if (template.slice(i, i + 3) === '{{{') {
			// Find matching closing brace, accounting for nesting
			const closingBraceIndex = findMatchingClosingBrace(template, i + 3, '{{{', '}}}')

			if (closingBraceIndex !== -1) {
				// Extract content between braces
				const fullContent = template.slice(i + 3, closingBraceIndex)

				// Find pipe character (but not escaped pipe)
				let pipeIndex = -1
				let j = 0
				while (j < fullContent.length) {
					if (fullContent[j] === '\\' && j + 1 < fullContent.length) {
						j += 2
						continue
					}
					if (fullContent[j] === '|') {
						pipeIndex = j
						break
					}
					j++
				}

				// Process value and pipeValue
				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				// Unescape special characters in value and pipeValue
				value = unescapeSpecialChars(value)
				if (pipeValue !== undefined) {
					pipeValue = unescapeSpecialChars(pipeValue)
				}

				// Handle the interpolation
				result += handler({
					braceCount: 3,
					pipeValue,
					value,
				})

				i = closingBraceIndex + 3
				continue
			}
		}

		// Check for double braces
		if (template.slice(i, i + 2) === '{{') {
			// Find matching closing brace, accounting for nesting
			const closingBraceIndex = findMatchingClosingBrace(template, i + 2, '{{', '}}')

			if (closingBraceIndex !== -1) {
				// Extract content between braces
				const fullContent = template.slice(i + 2, closingBraceIndex)

				// Find pipe character (but not escaped pipe)
				let pipeIndex = -1
				let j = 0
				while (j < fullContent.length) {
					if (fullContent[j] === '\\' && j + 1 < fullContent.length) {
						j += 2
						continue
					}
					if (fullContent[j] === '|') {
						pipeIndex = j
						break
					}
					j++
				}

				// Process value and pipeValue
				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				// Unescape special characters in value and pipeValue
				value = unescapeSpecialChars(value)
				if (pipeValue !== undefined) {
					pipeValue = unescapeSpecialChars(pipeValue)
				}

				// Handle the interpolation
				result += handler({
					braceCount: 2,
					pipeValue,
					value,
				})

				i = closingBraceIndex + 2
				continue
			}
		}

		// Check for single braces
		if (template[i] === '{') {
			// Find matching closing brace, accounting for nesting
			const closingBraceIndex = findMatchingClosingBrace(template, i + 1, '{', '}')

			if (closingBraceIndex !== -1) {
				// Extract content between braces
				const fullContent = template.slice(i + 1, closingBraceIndex)

				// Find pipe character (but not escaped pipe)
				let pipeIndex = -1
				let j = 0
				while (j < fullContent.length) {
					if (fullContent[j] === '\\' && j + 1 < fullContent.length) {
						j += 2
						continue
					}
					if (fullContent[j] === '|') {
						pipeIndex = j
						break
					}
					j++
				}

				// Process value and pipeValue
				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				// Unescape special characters in value and pipeValue
				value = unescapeSpecialChars(value)
				if (pipeValue !== undefined) {
					pipeValue = unescapeSpecialChars(pipeValue)
				}

				// Handle the interpolation
				result += handler({
					braceCount: 1,
					pipeValue,
					value,
				})

				i = closingBraceIndex + 1
				continue
			}
		}

		// If none of the above, just add the current character and move on
		result += template[i]
		i++
	}

	return result
}

/**
 * Helper function to unescape special characters in a string
 * @param text - The string to unescape
 * @returns The unescaped string
 */
function unescapeSpecialChars(text: string): string {
	let result = ''
	let i = 0

	while (i < text.length) {
		if (text[i] === '\\' && i + 1 < text.length) {
			const nextChar = text[i + 1]
			if (nextChar === '{' || nextChar === '}' || nextChar === '\\' || nextChar === '|') {
				result += nextChar
				i += 2
				continue
			}
		}

		result += text[i]
		i++
	}

	return result
}
