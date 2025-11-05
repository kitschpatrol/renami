import { describe, expect, it } from 'vitest'
import { extractLinkLabel } from '../src/lib/utilities/markdown'

describe('extractLinkLabel', () => {
	// Test handling of null/empty values
	it('should handle null and undefined values', () => {
		// eslint-disable-next-line unicorn/no-null, ts/no-unsafe-type-assertion
		expect(extractLinkLabel(null as unknown as string)).toBeNull()
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		expect(extractLinkLabel(undefined as unknown as string)).toBeUndefined()
	})

	it('should handle empty and whitespace strings', () => {
		expect(extractLinkLabel('')).toBe('')
		expect(extractLinkLabel('   ')).toBe('   ') // Returns original when trimmed is empty
	})

	// Test URL extraction
	it('should extract label from full URLs', () => {
		expect(extractLinkLabel('https://example.com/page')).toBe('page')
		expect(extractLinkLabel('http://example.com/path/to/page')).toBe('page')
		expect(extractLinkLabel('https://example.com/file.html')).toBe('file')
		expect(extractLinkLabel('https://example.com/document.pdf?query=123')).toBe('document')
		expect(extractLinkLabel('https://example.com/page#section')).toBe('page')
	})

	it('should handle URLs with special characters', () => {
		expect(extractLinkLabel('https://example.com/page-with-hyphens')).toBe('page-with-hyphens')
		expect(extractLinkLabel('https://example.com/page_with_underscores')).toBe(
			'page_with_underscores',
		)
	})

	it('should handle URLs with no path component', () => {
		expect(extractLinkLabel('https://example.com')).toBe('example')
		expect(extractLinkLabel('https://example.com/')).toBe('')
	})

	// Test markdown link extraction
	it('should extract label from markdown links', () => {
		expect(extractLinkLabel('[Label](https://example.com)')).toBe('Label')
		expect(extractLinkLabel('[Complex Label with spaces](https://example.com)')).toBe(
			'Complex Label with spaces',
		)
		expect(extractLinkLabel('[](https://example.com/page)')).toBe('page') // Empty label, process URL
	})

	it('should handle markdown links with special characters', () => {
		expect(extractLinkLabel('[Label with **bold**](https://example.com)')).toBe(
			'Label with **bold**',
		)
		expect(extractLinkLabel('[Label with *italic*](https://example.com)')).toBe(
			'Label with *italic*',
		)
	})

	// Test wiki-style link extraction
	it('should extract label from wiki-style links', () => {
		expect(extractLinkLabel('[[page]]')).toBe('page')
		expect(extractLinkLabel('[[page|Custom Label]]')).toBe('Custom Label')
		expect(extractLinkLabel('[[folder/page|Label with spaces]]')).toBe('Label with spaces')
	})

	it('should handle wiki-style links with special formatting', () => {
		expect(extractLinkLabel('[[page|Label with **bold**]]')).toBe('Label with **bold**')
		expect(extractLinkLabel('[[page|Label with *italic*]]')).toBe('Label with *italic*')
	})

	// Test nested cases and edge cases
	it('should handle trimmed input correctly', () => {
		expect(extractLinkLabel('  [Label](https://example.com)  ')).toBe('Label')
		expect(extractLinkLabel('\t[[page|Label]]\n')).toBe('Label')
	})

	it('should return original string when no pattern matches', () => {
		expect(extractLinkLabel('Just plain text')).toBe('Just plain text')
		expect(extractLinkLabel('Text with (parentheses)')).toBe('Text with (parentheses)')
		expect(extractLinkLabel('Text with [brackets]')).toBe('Text with [brackets]')
	})

	it('should handle URL fragments correctly', () => {
		expect(extractLinkLabel('https://example.com/page#section-1')).toBe('page')
		expect(extractLinkLabel('[Label](#section-1)')).toBe('Label')
	})

	it('should handle query parameters correctly', () => {
		expect(extractLinkLabel('https://example.com/search?q=query&page=1')).toBe('search')
		expect(extractLinkLabel('[Search Results](https://example.com/search?q=query&page=1)')).toBe(
			'Search Results',
		)
	})

	it('should extract label from incomplete wiki-style links with paths', () => {
		expect(extractLinkLabel('[[Contacts/Someone Else]')).toBe('Someone Else')
		expect(extractLinkLabel('[[Projects/Work/Important Project]')).toBe('Important Project')
	})
})
