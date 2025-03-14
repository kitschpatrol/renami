/* eslint-disable ts/require-await */

import { type Root as MarkdownAst } from 'mdast'
import { toString } from 'mdast-util-to-string'
import pupa from 'pupa'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { select } from 'unist-util-select'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'
import { type Transform } from '../transform'
import { type PathObject, pathObjectToString } from '../utilities/path'

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
 * @param callback Function that takes the Markdown object (AST + frontmatter) and returns a string
 * @returns renami transform function
 */
export function markdownCallback(
	callback: (
		filePath: PathObject,
		frontmatter: Record<string, unknown>,
		ast: MarkdownAst,
	) => Promise<string | undefined>,
): Transform {
	return async (filePath, options) => {
		const { fileAdapter } = options
		const fullPath = pathObjectToString(filePath)
		const contents = await fileAdapter.readFile(fullPath)
		const { ast, frontmatter } = getMarkdown(contents)
		return callback(filePath, frontmatter, ast)
	}
}

/**
 * Compose a filename from frontmatter using a template
 * @param template Template string with {placeholders} for frontmatter keys (Uses the Pupa micro-template library)
 * @returns renami transform function
 * @example `frontmatterTemplate('Note-{title}')`
 */
export function frontmatterTemplate(template: string): Transform {
	return markdownCallback(async (_, frontmatter) =>
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
	return markdownCallback(async (_, __, ast) =>
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
