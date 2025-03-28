import type { Root as MarkdownAst } from 'mdast'
import path from 'pathe'
import type { Options } from '../config'
import type { Transform } from '../transform'
import type { PathObject } from '../utilities/path'
import { interpolateDocument } from '../utilities/interpolate/document'
import { getMarkdown } from '../utilities/markdown'

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
		const result = callback({
			ast,
			filePath: context.filePath,
			frontmatter,
		})
		return result instanceof Promise ? result : result
	}
}

/**
 * Compose a filename from frontmatter or a Unified Markdown AST using a template string with `unist-util-select` selectors
 * @param template Template string with {key} for frontmatter and {{select}} for `unist-util-select` selectors (Uses the Pupa micro-template library)
 * @returns renami transform function
 */
export function markdownTemplate(template: string, options: Options): Transform {
	return markdownCallback(({ ast, frontmatter }) =>
		interpolateDocument(template, frontmatter, ast, options),
	)
}
