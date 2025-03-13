import { VFile } from 'vfile'
import { matter, type Options as MatterOptions } from 'vfile-matter'

/**
 * Extract frontmatter from a string using vfile-matter
 * @param content The string content containing frontmatter
 * @param options Optional configuration options from vfile-matter
 * @returns The parsed frontmatter data
 */
export function getFrontmatter(
	content: string,
	options: MatterOptions = {},
): Record<string, unknown> {
	// Create a VFile from the string
	const file = new VFile({ value: content })

	// Extract the frontmatter (no need to strip content since we don't use it)
	matter(file, options)

	// Just return the frontmatter data
	return file.data.matter as Record<string, unknown>
}
