import type { Root as MarkdownAst } from 'mdast'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { VFile } from 'vfile'
import { matter } from 'vfile-matter'

/**
 * Internal helper to extract AST from a Markdown string
 *
 * @param content The string content containing markdown
 *
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

	// Extract frontmatter data
	matter(file, {
		// Remove the frontmatter node from the AST
		// This ensures that selectors like `{{*:first-child}}` don't return YAML
		strip: true,
	})

	// Parse the content into an AST
	const ast = processor.parse(file)

	return {
		ast,
		frontmatter: (file.data.matter ?? {}) as Record<string, unknown>,
	}
}

const FULL_URL_REGEX = /^https?:\/\/\S+$/v
const URL_PART_SEPARATOR_REGEX = /[.?#]/v
const MD_LINK_REGEX = /\[([^\]]*)\]\(([^\)]+)\)/v
const WIKI_LINK_REGEX = /\[\[([^\|\]]+)(?:\|([^\]]+))?\]\]?/v

type LinkLabelStep = { label: string; nextUrl?: undefined } | { label?: undefined; nextUrl: string }

/**
 * Extracts a label from the last path segment of a URL, falling back to the
 * provided value if extraction fails.
 */
function extractUrlLabel(url: string, fallback: string): string {
	// Extract everything after the last slash, remove file extensions and query parameters
	const urlParts = url.split('/')

	// Special case for URLs with trailing slash
	if (urlParts.length > 0 && urlParts.at(-1) === '') {
		return '' // Return empty string for URLs ending with a slash
	}

	// Handle the case where there might not be a slash in the URL
	if (urlParts.length === 1) {
		return urlParts[0] ?? fallback // Return the whole URL if no slashes
	}

	const lastPart = urlParts.at(-1)

	// Check if lastPart is defined
	if (lastPart === undefined || lastPart === '') {
		return fallback
	}

	// Remove file extensions and query parameters
	const cleanLastPart = lastPart.split(URL_PART_SEPARATOR_REGEX)[0]

	// Return the part as is, or the fallback if extraction gives empty string
	return cleanLastPart === undefined || cleanLastPart === '' ? fallback : cleanLastPart
}

/**
 * Extracts a label from a wiki-style link like `[[url|label]]` or
 * `[[path/to/page]]`, falling back to the provided value if no wiki link is
 * found.
 */
function extractWikiLinkLabel(text: string, fallback: string): string {
	const wikiLinkMatch = WIKI_LINK_REGEX.exec(text)
	if (wikiLinkMatch) {
		// If it has a label (part after |), use it
		const label = wikiLinkMatch[2]
		if (label !== undefined && label !== '') {
			return label
		}

		// Extract the last part of the path for wiki links without labels
		const pathParts = wikiLinkMatch[1]?.split('/') ?? []
		const lastPart = pathParts.at(-1)
		if (lastPart !== undefined && lastPart !== '') {
			return lastPart
		}
	}

	// If no patterns match, return the fallback string
	return fallback
}

/**
 * Runs a single resolution pass, returning either a final label or the URL of a
 * label-less markdown link that needs another pass.
 */
function resolveLinkLabel(markdown: string): LinkLabelStep {
	// If the value is empty or not actually a string, return it as is
	if (typeof markdown !== 'string' || markdown === '') {
		return { label: markdown }
	}

	// Trim the string first
	const trimmedMarkdown = markdown.trim()

	// Check again after trimming in case it's now empty
	if (trimmedMarkdown === '') {
		return { label: markdown } // Return original if trimmed is empty
	}

	// Full URL pattern - if the entire string is a URL
	if (FULL_URL_REGEX.test(trimmedMarkdown)) {
		return { label: extractUrlLabel(trimmedMarkdown, markdown) }
	}

	// Regular Markdown link pattern [label](url)
	const mdLinkMatch = MD_LINK_REGEX.exec(trimmedMarkdown)
	if (mdLinkMatch) {
		// If there's a label, use it; otherwise, process the URL
		const label = mdLinkMatch[1]
		if (label !== undefined && label !== '') {
			return { label }
		}

		// This handles the case of [](url) by deferring to the URL
		const url = mdLinkMatch[2]
		return url === undefined ? { label: markdown } : { nextUrl: url }
	}

	// Wiki-style Markdown link pattern, or the original string if nothing matches
	return { label: extractWikiLinkLabel(trimmedMarkdown, markdown) }
}

/**
 * Creates nice readable labels from Markdown links Might be better to use the
 * micromark parser for this, but this is a good start
 *
 * @param markdown The string content containing markdown or a URL
 *
 * @returns Label string, or the original string if no links or URLs are found
 */
export function extractLinkLabel(markdown: string): string {
	let step = resolveLinkLabel(markdown)

	// Label-less links like [](url) defer to their URL for another pass
	while (step.nextUrl !== undefined) {
		step = resolveLinkLabel(step.nextUrl)
	}

	return step.label
}
