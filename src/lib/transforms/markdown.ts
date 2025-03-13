import { type Root as MarkdownAst } from 'mdast'
import pupa from 'pupa'
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
