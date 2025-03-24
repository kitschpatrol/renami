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

/**
 * Creates nice readable labels from Markdown links
 * Might be better to use the micromark parser for this, but this is a good start
 * @param markdown The string content containing markdown or a URL
 * @returns label string, or the original string if no links or URLs are found
 */
/**
 * Creates nice readable labels from Markdown links
 * @param markdown
 * @returns label string, or the original string if no links or URLs are found
 */
/**
 * Creates nice readable labels from Markdown links
 * @param markdown
 * @returns label string, or the original string if no links or URLs are found
 */
export function extractLinkLabel(markdown: string): string {
	// If the string is empty or null, return it as is
	if (!markdown) return markdown

	// Trim the string first
	const trimmedMarkdown = markdown.trim()

	// Check again after trimming in case it's now empty
	if (!trimmedMarkdown) return markdown // Return original if trimmed is empty

	// Full URL pattern - if the entire string is a URL
	const fullUrlRegex = /^https?:\/\/\S+$/
	if (fullUrlRegex.test(trimmedMarkdown)) {
		// Extract everything after the last slash, remove file extensions and query parameters
		const urlParts = trimmedMarkdown.split('/')

		// Special case for URLs with trailing slash
		if (urlParts.length > 0 && urlParts.at(-1) === '') {
			return '' // Return empty string for URLs ending with a slash
		}

		// Handle the case where there might not be a slash in the URL
		if (urlParts.length === 1) {
			return urlParts[0] // Return the whole URL if no slashes
		}

		const lastPart = urlParts.at(-1)

		// Check if lastPart is defined
		if (!lastPart) {
			return markdown
		}

		// Remove file extensions and query parameters
		const cleanLastPart = lastPart.split(/[.?#]/)[0]

		// Return the part as is, or the original if extraction gives empty string
		return cleanLastPart || markdown
	}

	// Regular Markdown link pattern [label](url)
	const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/
	const mdLinkMatch = mdLinkRegex.exec(trimmedMarkdown)
	if (mdLinkMatch) {
		const label = mdLinkMatch[1]
		const url = mdLinkMatch[2]

		// If there's a label, use it; otherwise, process the URL
		if (label) {
			return label
		}
		// This handles the case of [](url) by processing the URL recursively
		return extractLinkLabel(url)
	}

	// Wiki-style Markdown link pattern [[url|label]] or [[path/to/page]]
	// Handle both cases with or without the label part
	const wikiLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]?/
	const wikiLinkMatch = wikiLinkRegex.exec(trimmedMarkdown)
	if (wikiLinkMatch) {
		// If it has a label (part after |), use it
		if (wikiLinkMatch[2]) {
			return wikiLinkMatch[2]
		}
		// Extract the last part of the path for wiki links without labels
		const path = wikiLinkMatch[1]
		const pathParts = path.split('/')
		const lastPart = pathParts.at(-1)
		if (lastPart) {
			return lastPart
		}
	}

	// If no patterns match, return the original string
	return markdown
}
