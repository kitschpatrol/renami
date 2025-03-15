import { type Root as MarkdownAst } from 'mdast'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'

/**
 * Internal helper to extract AST from a Markdown string
 * @param content The string content containing markdown
 * @returns Object containing the AST and frontmatter
 */
export function getMarkdown(content: string): {
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
