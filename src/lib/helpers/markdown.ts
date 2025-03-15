import { type Root as MarkdownAst } from 'mdast'
import { toString } from 'mdast-util-to-string'
import path from 'path-browserify-esm'
import pupa from 'pupa'
import { select } from 'unist-util-select'
import { type Transform } from '../transform'
import { getMarkdown } from '../utilities/markdown'
import { type PathObject } from '../utilities/path'
import { emptyIsUndefined } from '../utilities/string'

/**
 * Compose a filename from a Unified Markdown AST and / or frontmatter object using a callback function
 * @param callback Function that takes the Markdown object (AST + frontmatter) and returns a string or undefined if no transform is possible. Can be sync or async.
 * @returns renami transform function
 */
export function markdownCallback(
	callback: (markdown: {
		ast: MarkdownAst
		filePath: PathObject
		frontmatter: Record<string, unknown>
	}) => PathObject | Promise<PathObject | string | undefined> | string | undefined,
): Transform {
	return async (context) => {
		const fullPath = path.format(context.filePath)
		const contents = await context.fileAdapter.readFile(fullPath)

		const { ast, frontmatter } = getMarkdown(contents)
		const result = callback({ ast, filePath: context.filePath, frontmatter })
		return result instanceof Promise ? result : result
	}
}

/**
 * Compose a filename from frontmatter using a template
 * @param template Template string with {placeholders} for frontmatter keys (Uses the Pupa micro-template library)
 * @returns renami transform function
 * @example `frontmatterTemplate('Note-{title}')`
 */
export function frontmatterTemplate(template: string): Transform {
	return markdownCallback(({ frontmatter }) => {
		const result = pupa(template, frontmatter, {
			ignoreMissing: true,
			transform({ value }) {
				if (value === undefined) {
					return ''
				}
				return value
			},
		})

		return emptyIsUndefined(result)
	})
}

/**
 * Compose a filename from a Unified Markdown AST using a template string with `unist-util-select` selectors
 * @param template Template string with {placeholders} for `unist-util-select` selectors (Uses the Pupa micro-template library)
 * @returns renami transform function
 */
export function markdownTemplate(template: string): Transform {
	return markdownCallback(({ ast }) => {
		const result = pupa(template, ast, {
			ignoreMissing: true,
			transform({ key }) {
				// Ignore values, and just pass Keys to the selector
				const selected = select(key, ast)
				return selected === undefined ? '' : toString(selected)
			},
		})

		return emptyIsUndefined(result)
	})
}
