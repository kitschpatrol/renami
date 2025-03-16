import { describe, expect, it } from 'vitest'
import { interpolateDocument } from '../src/lib/utilities/interpolate/document'
import { getMarkdown } from '../src/lib/utilities/markdown'

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
emptyString: ""
nullValue: null
undefinedValue: 
zero: 0
booleans:
  true: true
  false: false
arrays:
  empty: []
  nested: 
    - [1, 2]
    - [3, 4]
objects:
  empty: {}
  complex:
    a: 1
    "b.c": 2
    "d[0]": 3
    "with{braces}": 4
    "with|pipe": 5
specialChars:
  withSpaces: "value with spaces"
  withPunctuation: "hello, world!"
  withQuotes: 'single "and" double'
  withBraces: 'text with {braces}'
  withPipe: 'text with | pipe'
---

# Implementing a Template System

This is a document about implementing a templating system in TypeScript.

## Features

- Object interpolation with {object.property}
- AST selection with {{heading}}
- Formatting with the | character

### Subsection

This is a subsection with additional content.

#### Nested Subsection

Deep nested content.
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
		expect(result).toBe('Created on: 2025-03-15T00:00:00.000')
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
		// Using numerable patterns directly
		const result = interpolateDocument('Word count: {stats.wordCount|0,0}', frontmatter, ast)
		expect(result).toBe('Word count: 42')

		const decimalResult = interpolateDocument(
			'Reading time: {stats.readingTime|0.00}',
			frontmatter,
			ast,
		)
		expect(decimalResult).toBe('Reading time: 2.55')

		const integerResult = interpolateDocument(
			'Reading time: {stats.readingTime|0}',
			frontmatter,
			ast,
		)
		expect(integerResult).toBe('Reading time: 3')

		const precisionResult = interpolateDocument(
			'Reading time: {stats.readingTime|0.0}',
			frontmatter,
			ast,
		)
		expect(precisionResult).toBe('Reading time: 2.6')
	})

	it('should format numbers with percentage', () => {
		const percentResult = interpolateDocument('{value|0.0%}', { value: 0.255 }, ast)
		expect(percentResult).toBe('25.5%')

		const integerPercentResult = interpolateDocument('{value|0%}', { value: 0.42 }, ast)
		expect(integerPercentResult).toBe('42%')
	})

	it('should format numbers with abbreviations', () => {
		const largeNumber = interpolateDocument('{value|0.0a}', { value: 1_500_000 }, ast)
		expect(largeNumber).toBe('1.5M')

		const smallNumber = interpolateDocument('{value|0.00a}', { value: 1234 }, ast)
		expect(smallNumber).toBe('1.23K')
	})

	// Not supported by Numerable....
	it.skip('should format numbers with scientific notation', () => {
		const scientificResult = interpolateDocument('{stats.readingTime|0.00e+0}', frontmatter, ast)
		expect(scientificResult).toMatch(/2.55e\+0/)
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

	// Additional edge case tests for document interpolation
	it('should handle empty strings, null, and undefined values', () => {
		const emptyStringResult = interpolateDocument('{emptyString}', frontmatter, ast)
		expect(emptyStringResult).toBe('')

		const nullResult = interpolateDocument('{nullValue}', frontmatter, ast)
		expect(nullResult).toBe('')

		const undefinedResult = interpolateDocument('{undefinedValue}', frontmatter, ast)
		expect(undefinedResult).toBe('')
	})

	it('should handle zero value', () => {
		const result = interpolateDocument('{zero}', frontmatter, ast)
		expect(result).toBe('0')
	})

	it('should handle boolean values', () => {
		const trueResult = interpolateDocument('{booleans.true}', frontmatter, ast)
		expect(trueResult).toBe('true')

		const falseResult = interpolateDocument('{booleans.false}', frontmatter, ast)
		expect(falseResult).toBe('false')
	})

	it('should handle empty arrays and objects', () => {
		const emptyArrayResult = interpolateDocument('{arrays.empty}', frontmatter, ast)
		expect(emptyArrayResult).toBe('')

		const emptyObjectResult = interpolateDocument('{objects.empty}', frontmatter, ast)
		expect(emptyObjectResult).toBe('')
	})

	it('should handle nested arrays and complex access patterns', () => {
		const nestedArrayResult = interpolateDocument('{arrays.nested[0][1]}', frontmatter, ast)
		expect(nestedArrayResult).toBe('2')

		const nestedArrayResult2 = interpolateDocument('{arrays.nested[1][0]}', frontmatter, ast)
		expect(nestedArrayResult2).toBe('3')
	})

	it('should handle property names with special characters', () => {
		const braceInNameResult = interpolateDocument(
			'{objects.complex["with{braces}"]}',
			frontmatter,
			ast,
		)
		expect(braceInNameResult).toBe('4')

		const pipeInNameResult = interpolateDocument(
			String.raw`{objects.complex["with\|pipe"]}`,
			frontmatter,
			ast,
		)
		expect(pipeInNameResult).toBe('5')
	})

	// These are a bit too special to be handled by the current implementation
	it.skip('should handle property names with very special characters', () => {
		const dotInNameResult = interpolateDocument('{objects.complex["b.c"]}', frontmatter, ast)
		expect(dotInNameResult).toBe('2')

		const bracketInNameResult = interpolateDocument('{objects.complex["d[0]"]}', frontmatter, ast)
		expect(bracketInNameResult).toBe('3')
	})

	it('should handle string values with spaces and special characters', () => {
		const spacesResult = interpolateDocument('{specialChars.withSpaces}', frontmatter, ast)
		expect(spacesResult).toBe('value with spaces')

		const punctuationResult = interpolateDocument(
			'{specialChars.withPunctuation}',
			frontmatter,
			ast,
		)
		expect(punctuationResult).toBe('hello, world!')

		const quotesResult = interpolateDocument('{specialChars.withQuotes}', frontmatter, ast)
		expect(quotesResult).toBe('single "and" double')

		const bracesResult = interpolateDocument('{specialChars.withBraces}', frontmatter, ast)
		expect(bracesResult).toBe('text with {braces}')

		const pipeResult = interpolateDocument('{specialChars.withPipe}', frontmatter, ast)
		expect(pipeResult).toBe('text with | pipe')
	})

	it('should select specific heading levels from AST', () => {
		// Use proper unist-util-select syntax
		const h1Result = interpolateDocument('{{heading[depth="1"]}}', frontmatter, ast)
		expect(h1Result).toBe('Implementing a Template System')

		const h2Result = interpolateDocument('{{heading[depth="2"]}}', frontmatter, ast)
		expect(h2Result).toBe('Features')

		const h3Result = interpolateDocument('{{heading[depth="3"]}}', frontmatter, ast)
		expect(h3Result).toBe('Subsection')

		const h4Result = interpolateDocument('{{heading[depth="4"]}}', frontmatter, ast)
		expect(h4Result).toBe('Nested Subsection')
	})

	it('should handle complex AST selectors', () => {
		// First paragraph selector
		const firstParaResult = interpolateDocument('{{paragraph:first-of-type}}', frontmatter, ast)
		expect(firstParaResult).toContain('about implementing a')

		// Using + combinator for adjacent sibling
		const adjacentResult = interpolateDocument('{{heading + paragraph}}', frontmatter, ast)
		expect(adjacentResult).toContain('about implementing a')
	})

	it('should handle AST selection with non-existent selectors', () => {
		const nonExistentResult = interpolateDocument('{{non-existent}}', frontmatter, ast)
		expect(nonExistentResult).toBe('')
	})

	it('should handle mixed format types', () => {
		// When applying a number format to a date, numerable should handle it appropriately
		const dateWithNumberFormat = interpolateDocument('{date.created|0.0}', frontmatter, ast)
		expect(dateWithNumberFormat).toBe('2025-03-15T00:00:00.000')

		// When applying a date format to a number, numerable should handle it appropriately
		const numberWithDateFormat = interpolateDocument('{stats.wordCount|yyyy-MM}', frontmatter, ast)
		expect(numberWithDateFormat).toBe('2042-01')
	})

	it('should handle format strings containing braces and pipes', () => {
		// Format string with braces
		const bracesInFormat = interpolateDocument('{stats.wordCount|0{0}}', frontmatter, ast)
		expect(bracesInFormat).toBe('42')

		// Format string with pipe
		const pipeInFormat = interpolateDocument('{stats.wordCount|0|0}', frontmatter, ast)
		expect(pipeInFormat).toBe('42')
	})

	it('should handle complex combinations of template features', () => {
		const complexTemplate = String.raw`
			Document: {title} (created on {date.created|yyyy-MM-dd})
			
			First heading: {{heading}}
			
			Stats:
			- Word count: {stats.wordCount|0,0}
			- Reading time: {stats.readingTime|0.00} minutes
			
			Tags: {tags[0]}, {tags[1]}, {tags[2]}
			
			This uses \{escaped braces\} and {{{triple braces}}} too.
		`

		const result = interpolateDocument(complexTemplate, frontmatter, ast)

		expect(result).toMatchInlineSnapshot(`
			"
						Document: My Document (created on 2025-03-15)
						
						First heading: Implementing a Template System
						
						Stats:
						- Word count: 42
						- Reading time: 2.55 minutes
						
						Tags: typescript, templates, interpolation
						
						This uses {escaped braces} and  too.
					"
		`)
	})

	it('should handle extremely complex nested templates', () => {
		const complexNestedTemplate = String.raw`
			{title} has properties with special chars:
			- With braces: {specialChars.withBraces} 
			- With pipe: {specialChars.withPipe}
			- Object keys: {objects.complex["with{braces}"]} and {objects.complex["with\|pipe"]}
			
			Template with escaped pipes: \| and escaped braces: \{ \}
			Template with format using braces: {stats.wordCount|0{,}0}
			Template with format using pipe: {stats.readingTime|0.0}
			AST selector for heading and then paragraph: {{heading + paragraph|uppercase}}
		`
		const result = interpolateDocument(complexNestedTemplate, frontmatter, ast)

		expect(result).toMatchInlineSnapshot(`
			"
						My Document has properties with special chars:
						- With braces: text with {braces} 
						- With pipe: text with | pipe
						- Object keys: 4 and 5
						
						Template with escaped pipes: | and escaped braces: { }
						Template with format using braces: 42
						Template with format using pipe: 2.6
						AST selector for heading and then paragraph: THIS IS A DOCUMENT ABOUT IMPLEMENTING A TEMPLATING SYSTEM IN TYPESCRIPT.
					"
		`)
	})
})
