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
 * Core interpolation function that processes templates with callback-based handling
 * @param template - The template string to process
 * @param handler - Callback function that processes each interpolation
 * @returns - The processed string with interpolations replaced
 */
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
			// Only treat backslash as escape for brace characters or another backslash
			const nextChar = template[i + 1]
			if (nextChar === '{' || nextChar === '}' || nextChar === '\\') {
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
			const endIndex = template.indexOf('}}}', i + 3)
			if (endIndex !== -1) {
				// Find content and optional pipe value
				const fullContent = template.slice(i + 3, endIndex)
				const pipeIndex = fullContent.indexOf('|')

				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				result += handler({
					braceCount: 3,
					pipeValue,
					value,
				})

				i = endIndex + 3
				continue
			}
		}

		// Check for double braces
		if (template.slice(i, i + 2) === '{{') {
			const endIndex = template.indexOf('}}', i + 2)
			if (endIndex !== -1) {
				// Find content and optional pipe value
				const fullContent = template.slice(i + 2, endIndex)
				const pipeIndex = fullContent.indexOf('|')

				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				result += handler({
					braceCount: 2,
					pipeValue,
					value,
				})

				i = endIndex + 2
				continue
			}
		}

		// Check for single braces
		if (template[i] === '{') {
			const endIndex = template.indexOf('}', i + 1)
			if (endIndex !== -1) {
				// Find content and optional pipe value
				const fullContent = template.slice(i + 1, endIndex)
				const pipeIndex = fullContent.indexOf('|')

				let pipeValue
				let value
				if (pipeIndex === -1) {
					value = fullContent
				} else {
					value = fullContent.slice(0, pipeIndex)
					pipeValue = fullContent.slice(pipeIndex + 1)
				}

				result += handler({
					braceCount: 1,
					pipeValue,
					value,
				})

				i = endIndex + 1
				continue
			}
		}

		// If none of the above, just add the current character and move on
		result += template[i]
		i++
	}

	return result
}
