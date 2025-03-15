import { describe, expect, it } from 'vitest'
import { interpolate } from '../src/lib/utilities/interpolate/core'
import { interpolateDocument } from '../src/lib/utilities/interpolate/document'
import { getMarkdown } from '../src/lib/utilities/markdown'

describe('Core Interpolation', () => {
	it('should handle basic interpolation with a custom handler', () => {
		const template = 'Hello, {name}!'
		const result = interpolate(template, (context) => {
			expect(context.braceCount).toBe(1)
			expect(context.value).toBe('name')
			expect(context.pipeValue).toBeUndefined()
			return 'World'
		})
		expect(result).toBe('Hello, World!')
	})

	it('should handle different brace counts', () => {
		const template = '{one} {{two}} {{{three}}}'
		const counts: number[] = []
		const result = interpolate(template, (context) => {
			counts.push(context.braceCount)
			return `[${context.braceCount}:${context.value}]`
		})
		expect(result).toBe('[1:one] [2:two] [3:three]')
		expect(counts).toEqual([1, 2, 3])
	})

	it('should handle pipe values', () => {
		const template = '{value|format}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value')
			expect(context.pipeValue).toBe('format')
			return `formatted:${context.value}`
		})
		expect(result).toBe('formatted:value')
	})

	it('should handle escaped braces', () => {
		const template = String.raw`This \{is escaped\} but {this|format} is not`
		const result = interpolate(template, (context) => 'interpolated')
		expect(result).toBe('This {is escaped} but interpolated is not')
	})
})

describe('Document Interpolation', () => {
	// Sample markdown content
	const markdown = `---
title: My Document
date:
  created: '2025-03-15T00:00:00.000'
  updated: '2025-03-16T00:00:00.000'
tags:
  - typescript
  - templates
  - interpolation
stats:
  wordCount: 42
  readingTime: 2.55
---

# Implementing a Template System

This is a document about implementing a templating system in TypeScript.

## Features

- Object interpolation with {object.property}
- AST selection with {{heading}}
- Formatting with the | character
`

	// Use the getMarkdown helper to parse the markdown
	const { ast, frontmatter } = getMarkdown(markdown)

	// Test cases
	it('should interpolate basic object properties', () => {
		const result = interpolateDocument('Document: {title}', frontmatter, ast)
		expect(result).toBe('Document: My Document')
	})

	it('should interpolate nested object properties', () => {
		const result = interpolateDocument('Created on: {date.created}', frontmatter, ast)
		expect(result).toBe('Created on: 2025-03-15')
	})

	it('should handle array access', () => {
		const result = interpolateDocument('Primary tag: {tags[0]}', frontmatter, ast)
		expect(result).toBe('Primary tag: typescript')
	})

	it('should select from AST', () => {
		const result = interpolateDocument('Heading: {{heading}}', frontmatter, ast)
		expect(result).toBe('Heading: Implementing a Template System')
	})

	it('should format dates', () => {
		const result = interpolateDocument('Date: {date.created|yyyy-MM-dd}', frontmatter, ast)
		expect(result).toBe('Date: 2025-03-15')

		const longFormatResult = interpolateDocument(
			'Date: {date.created|MMMM d, yyyy}',
			frontmatter,
			ast,
		)
		expect(longFormatResult).toBe('Date: March 15, 2025')
	})

	it('should format numbers', () => {
		const result = interpolateDocument('Word count: {stats.wordCount|number}', frontmatter, ast)
		expect(result).toBe('Word count: 42')

		const timeResult = interpolateDocument(
			'Reading time: {stats.readingTime|0.#}',
			frontmatter,
			ast,
		)
		expect(timeResult).toBe('Reading time: 2.5')
	})

	it('should handle escaped characters', () => {
		const result = interpolateDocument(String.raw`Escaped braces: \{title\}`, frontmatter, ast)
		expect(result).toBe('Escaped braces: {title}')
	})

	it('should handle the combined example from requirements', () => {
		const result = interpolateDocument(
			'My Note about {{heading}} - {date.created|yyyy-MM-dd}',
			frontmatter,
			ast,
		)
		expect(result).toBe('My Note about Implementing a Template System - 2025-03-15')
	})

	it('should return empty string for non-existent paths', () => {
		const result = interpolateDocument('Missing: {nonexistent.path}', frontmatter, ast)
		expect(result).toBe('Missing: ')
	})

	it('should handle complex path with bracket notation', () => {
		const result = interpolateDocument('Complex: {date["created"]}', frontmatter, ast)
		expect(result).toBe('Complex: 2025-03-15')
	})

	it('should handle multiple interpolations in one template', () => {
		const result = interpolateDocument(
			'{title} (tags: {tags[0]}, {tags[1]}) - {{heading}}',
			frontmatter,
			ast,
		)
		expect(result).toBe(
			'My Document (tags: typescript, templates) - Implementing a Template System',
		)
	})

	it('should handle empty format strings', () => {
		const result = interpolateDocument('{title|}', frontmatter, ast)
		expect(result).toBe('My Document')
	})

	it('should leave unknown format strings as-is', () => {
		const value = 'test'
		const result = interpolateDocument('{title|invalid-format}', { title: value }, ast)
		expect(result).toBe(value)
	})

	it('should return empty string for triple braces', () => {
		const result = interpolateDocument('Triple braces: {{{anything}}}', frontmatter, ast)
		expect(result).toBe('Triple braces: ')
	})
})
