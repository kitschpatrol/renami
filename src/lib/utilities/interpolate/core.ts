/* eslint-disable max-depth */
/* eslint-disable complexity */

export type InterpolationContext = {
	braceCount: number
	pipeValues?: string | string[] | undefined
	value: string
}

// A constant empty array to ensure reference equality when needed.
const EMPTY_ARRAY: string[] = []

/**
 * Interpolates a template string by replacing tokens with handler‐generated strings.
 *
 * A token is defined by an opening sequence of one or more unescaped `{` and a matching closing
 * sequence of unescaped `}`. The number of consecutive opening braces is stored as `braceCount`.
 *
 * If the closing sequence contains more braces than the opening sequence, the “extra” braces are
 * considered part of the token’s content. For example, in `{outer{inner}}` the single opening brace
 * is matched by two closing braces so that the token’s raw content becomes `"outer{inner}"`.
 *
 * Within a token, a literal pipe character (`|`) can be escaped by a backslash. Tokens may have a
 * format: the raw content is split on unescaped pipes (`|`), where the first segment is the main
 * value and subsequent segments (if any) become the pipe values. When there is exactly one format segment
 * that is empty, the handler receives an empty array.
 *
 * Escaped braces, pipes, and backslashes outside tokens are unescaped in the output.
 *
 * Detailed Steps:
 *
 * 1. Loop through the template one character at a time.
 * - If a backslash is encountered and the next character is one of `{`, `}`, `|`, or `\`,
 * output the next character literally and skip the escape.
 *
 * 2. When an unescaped `{` is found, start processing a token:
 * a. Count all consecutive `{` characters; this count is stored as `braceCount`.
 * b. Mark the start of the token’s content immediately after the opening braces.
 *
 * 3. Search for a matching closing delimiter for this token:
 * - Scan forward (starting at the content) and, while ignoring escaped characters,
 * look for a sequence of consecutive `}` characters whose count is at least `braceCount`.
 * - Each time such a candidate is found, update (overwrite) the candidate.
 * - However, once at least one candidate has been found, if an unescaped `{` is encountered
 * (indicating the start of a new token), break the scan so that candidates from later tokens
 * do not “leak” into the current one.
 *
 * 4. If a valid closing delimiter candidate was found:
 * - The token’s raw content is defined as the slice from the content start up to the candidate’s
 * position plus any extra `}` (i.e. candidateRun – braceCount extra characters are included).
 * - Update the global index to skip over the entire closing delimiter.
 *
 * 5. Process escapes in the raw token content:
 * - Replace escaped pipes (`\|`) with a unique placeholder (so splitting on literal pipes is safe).
 * - Also unescape any escaped `{`, `}`, or `\`.
 *
 * 6. Split the processed token on literal pipe characters.
 * - The first segment becomes the token’s main value.
 * - Any additional segments become the pipe values. If there is exactly one extra segment and it’s empty,
 * return the constant EMPTY_ARRAY.
 *
 * 7. Call the provided handler with an InterpolationContext object and append its return value to the result.
 *
 * 8. If no valid closing delimiter is found, output the token’s starting brace(s) and subsequent text literally.
 * @param template The template string.
 * @param handler A function that receives the context for each interpolation token and returns the replacement string.
 * @returns The interpolated string.
 */
export function interpolate(
	template: string,
	handler: (context: InterpolationContext) => string,
): string {
	// A unique placeholder used to protect escaped pipes during splitting.
	const ESCAPED_PIPE = '\u0001'
	let result = ''
	let i = 0

	// Process the template one character at a time.
	while (i < template.length) {
		const char = template[i]

		// Handle escape sequences outside tokens.
		if (char === '\\') {
			// If the next character is escapable, output it literally.
			if (i + 1 < template.length && '{}|\\'.includes(template[i + 1])) {
				result += template[i + 1]
				i += 2
			} else {
				result += char
				i++
			}
		} else if (char === '{') {
			// Beginning of an interpolation token.
			const tokenStart = i // In case we fail to find a closing delimiter.
			let braceCount = 0

			// Count consecutive unescaped opening braces.
			while (i < template.length && template[i] === '{') {
				braceCount++
				i++
			}
			// Mark where the token’s raw content begins.
			const contentStart = i

			// ------------------------------------------------------------
			// Search for the closing delimiter candidate.
			// We scan from the content start until (a) the end of the template,
			// or (b) we encounter an unescaped '{' after having found at least one valid candidate.
			// ------------------------------------------------------------
			let candidateIndex = -1
			let candidateRun = 0
			let pos = i
			while (pos < template.length) {
				if (template[pos] === '\\') {
					// Skip escaped characters.
					pos += 2
					continue
				}
				if (template[pos] === '}') {
					// Count the run of consecutive closing braces.
					let temp = pos
					let run = 0
					while (temp < template.length && template[temp] === '}') {
						run++
						temp++
					}
					// If the run is long enough, record/update the candidate.
					if (run >= braceCount) {
						candidateIndex = pos
						candidateRun = run
					}
					pos = temp
					continue
				}
				// If we've already seen a valid candidate and now encounter an unescaped '{',
				// break to prevent later tokens from interfering.
				if (candidateIndex !== -1 && template[pos] === '{') {
					break
				}
				pos++
			}

			// If a valid closing delimiter candidate was found...
			if (candidateIndex === -1) {
				// No valid closing delimiter was found; output the text literally.
				result += template.slice(tokenStart, i)
			} else {
				// Compute the end index of the token’s raw content.
				// Any extra closing braces (beyond what’s needed) are included in the token content.
				const tokenRaw = template.slice(contentStart, candidateIndex + (candidateRun - braceCount))
				// Advance the main index past the entire closing delimiter.
				i = candidateIndex + candidateRun

				// ------------------------------------------------------------
				// Process escape sequences inside the token content.
				// Escaped pipes are temporarily replaced with a placeholder.
				// ------------------------------------------------------------
				let processedToken = ''
				let j = 0
				while (j < tokenRaw.length) {
					if (tokenRaw[j] === '\\' && j + 1 < tokenRaw.length) {
						const nextChar = tokenRaw[j + 1]
						if (nextChar === '|') {
							processedToken += ESCAPED_PIPE
							j += 2
							continue
						} else if ('{}|\\'.includes(nextChar)) {
							processedToken += nextChar
							j += 2
							continue
						}
					}
					processedToken += tokenRaw[j]
					j++
				}

				// Split the processed token on literal pipe characters.
				let parts = processedToken.split('|')
				// Restore any escaped pipes.
				parts = parts.map((part) => part.replaceAll(ESCAPED_PIPE, '|'))
				const value = parts[0]
				let pipeValues: string | string[] | undefined
				if (parts.length > 1) {
					if (parts.length === 2 && parts[1] === '') {
						pipeValues = EMPTY_ARRAY
					} else if (parts.length === 2) {
						pipeValues = parts[1]
					} else {
						pipeValues = parts.slice(1)
					}
				}

				// Call the handler with the context and append its output.
				const replacement = handler({ braceCount, pipeValues, value })
				result += replacement
			}
		} else {
			// Regular character: simply append.
			result += char
			i++
		}
	}

	return result
}
