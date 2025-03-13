import { type Root as MarkdownAst } from 'mdast'
import { toString } from 'mdast-util-to-string'
import pupa from 'pupa'
import { select } from 'unist-util-select'
import { getMarkdown } from '../utilities/markdown'
import { pathObjectToString } from '../utilities/path'
import { type Transform } from './core'

/**
 * Compose a filename from a Unified Markdown AST and / or frontmatter object using a callback function
 * @param callback Function that takes the Markdown object (AST + frontmatter) and returns a string
 * @returns renami transform function
 */
export function markdown(
	callback: (markdown: { ast: MarkdownAst; frontmatter: Record<string, unknown> }) => string,
): Transform {
	return async (filePath, options) => {
		const { fileAdapter } = options
		const fullPath = pathObjectToString(filePath)
		const contents = await fileAdapter.readFile(fullPath)
		return callback(getMarkdown(contents))
	}
}

/**
 * Compose a filename from frontmatter using a template
 * @param template Template string with {placeholders} for frontmatter keys (Uses the Pupa micro-template library)
 * @returns renami transform function
 * @example `frontmatterTemplate('Note-{title}')`
 */
export function frontmatterTemplate(template: string): Transform {
	return markdown(({ frontmatter }) =>
		pupa(template, frontmatter, {
			ignoreMissing: true,
			transform({ value }) {
				if (value === undefined) {
					return ''
				}
				return value
			},
		}),
	)
}

/**
 * Compose a filename from a Unified Markdown AST using a template string with `unist-util-select` selectors
 * @param template Template string with {placeholders} for `unist-util-select` selectors (Uses the Pupa micro-template library)
 * @returns renami transform function
 */
export function markdownTemplate(template: string): Transform {
	return markdown(({ ast }) =>
		pupa(template, ast, {
			ignoreMissing: true,
			transform({ key }) {
				// Ignore values, and just pass Keys to the selector
				const selected = select(key, ast)
				return selected === undefined ? '' : toString(selected)
			},
		}),
	)
}
