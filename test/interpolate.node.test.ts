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
		const result = interpolate(template, () => 'interpolated')
		expect(result).toBe('This {is escaped} but interpolated is not')
	})

	// Additional edge case tests for core interpolation
	it('should handle empty templates', () => {
		const template = ''
		const result = interpolate(template, () => 'should not be called')
		expect(result).toBe('')
	})

	it('should handle templates with only text (no interpolation)', () => {
		const template = 'This is just plain text'
		const result = interpolate(template, () => 'should not be called')
		expect(result).toBe('This is just plain text')
	})

	it('should handle templates with unclosed braces', () => {
		const template = 'Unclosed brace {test'
		const result = interpolate(template, () => 'interpolated')
		expect(result).toBe('Unclosed brace {test')
	})

	it('should handle templates with unescaped escape character', () => {
		const template = String.raw`Backslash \ character`
		const result = interpolate(template, () => 'should not be called')
		expect(result).toBe(String.raw`Backslash \ character`)
	})

	it('should handle multiple escape sequences', () => {
		const template = String.raw`\{one\} \{two\} \{three\}`
		const result = interpolate(template, () => 'should not be called')
		expect(result).toBe('{one} {two} {three}')
	})

	it('should handle escape at the end of string', () => {
		const template = 'End with escape \\'
		const result = interpolate(template, () => 'should not be called')
		expect(result).toBe('End with escape \\')
	})

	it('should handle multiple consecutive interpolations', () => {
		const template = '{one}{two}{three}'
		const values: string[] = []
		const result = interpolate(template, (context) => {
			values.push(context.value)
			return `${context.value.toUpperCase()} `
		})

		expect(result).toBe('ONE TWO THREE ')
		expect(values).toEqual(['one', 'two', 'three'])
	})

	it('should handle nested-looking braces (not actually nested)', () => {
		const template = '{outer{inner}}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('outer{inner')
			return 'replaced'
		})
		expect(result).toBe('replaced}')
	})

	it('should handle pipe character with empty format string', () => {
		const template = '{value|}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value')
			expect(context.pipeValue).toBe('')
			return 'formatted'
		})
		expect(result).toBe('formatted')
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
specialChars:
  withSpaces: "value with spaces"
  withPunctuation: "hello, world!"
  withQuotes: 'single "and" double'
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
		const result = interpolateDocument('Word count: {stats.wordCount|integer}', frontmatter, ast)
		expect(result).toBe('Word count: 42')

		const decimalResult = interpolateDocument(
			'Reading time: {stats.readingTime|decimal}',
			frontmatter,
			ast,
		)
		expect(decimalResult).toBe('Reading time: 2.55')

		const integerResult = interpolateDocument(
			'Reading time: {stats.readingTime|.0000}',
			frontmatter,
			ast,
		)
		expect(integerResult).toBe('Reading time: 3')

		const precisionResult = interpolateDocument(
			'Reading time: {stats.readingTime|.1}',
			frontmatter,
			ast,
		)
		expect(precisionResult).toBe('Reading time: 2.6')
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

	it('should handle AST selection with non-existent selectors', () => {
		const nonExistentResult = interpolateDocument('{{non-existent}}', frontmatter, ast)
		expect(nonExistentResult).toBe('')
	})

	it('should handle mixed format types', () => {
		// Date format for a minimal but legitimate number should return a date
		const numberWithDateFormat = interpolateDocument(
			'{stats.wordCount|yyyy-MM-dd}',
			frontmatter,
			ast,
		)
		expect(numberWithDateFormat).toBe('2042-01-01')

		// Date format for a minimal but legitimate number should return a number
		const weirdNumberWithDateFormat = interpolateDocument(
			'{stats.readingTime|yyyy-MM-dd}',
			frontmatter,
			ast,
		)
		expect(weirdNumberWithDateFormat).toBe('2.55')

		// Number format for a date
		const dateWithNumberFormat = interpolateDocument('{date.created|.2}', frontmatter, ast)
		expect(dateWithNumberFormat).toBe('.2')
	})

	it('should format numbers with scientific notation', () => {
		const scientificResult = interpolateDocument('{stats.readingTime|scientific}', frontmatter, ast)
		expect(scientificResult).toMatch(/2\.55E\d+/) // Format may vary slightly by implementation
	})

	it('should handle complex combinations of template features', () => {
		const complexTemplate = String.raw`
			Document: {title} (created on {date.created|yyyy-MM-dd})
			
			First heading: {{heading}}
			
			Stats:
			- Word count: {stats.wordCount|integer}
			- Reading time: {stats.readingTime|.2} minutes
			
			Tags: {tags[0]}, {tags[1]}, {tags[2]}
			
			This uses \{escaped braces\} and {{{triple braces}}} too.
		`
		const result = interpolateDocument(complexTemplate, frontmatter, ast)
		expect(result).toContain('Document: My Document')
		expect(result).toContain('created on 2025-03-15')
		expect(result).toContain('First heading: Implementing a Template System')
		expect(result).toContain('Word count: 42')
		expect(result).toContain('Reading time: 2.55 minutes')
		expect(result).toContain('Tags: typescript, templates, interpolation')
		expect(result).toContain('{escaped braces}')
		expect(result).toContain(' too.')
	})
})
