import { type Root as MarkdownAst } from 'mdast'
import { toString } from 'mdast-util-to-string'
import path from 'path-browserify-esm'
import pupa from 'pupa'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { select } from 'unist-util-select'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'
import { type Transform } from '../transform'
import { type PathObject } from '../utilities/path'
import { emptyIsUndefined } from '../utilities/string'

/**
 * Internal helper to extract AST from a Markdown string
 * @param content The string content containing markdown
 * @returns Object containing the AST and frontmatter
 */
function getMarkdown(content: string): {
	ast: MarkdownAst
	frontmatter: Record<string, unknown>
} {
	// Create a VFile from the string
	const file = new VFile({ value: content })

	// Process with unified/remark to get the AST
	const processor = unified()
		.use(remarkParse) // Parse markdown to AST
		.use(remarkGfm) // Support GitHub Flavored Markdown
		.use(remarkFrontmatter) // Parse frontmatter syntax

	// Parse the content into an AST
	const ast = processor.parse(file)

	// Extract frontmatter data
	matter(file, {
		strip: false,
	})

	return {
		ast,
		frontmatter: (file.data.matter ?? {}) as Record<string, unknown>,
	}
}

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
