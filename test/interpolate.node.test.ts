import { describe, expect, it } from 'vitest'
import { interpolate } from '../src/lib/utilities/interpolate/core'

describe('Core Interpolation', () => {
	it('should handle basic interpolation with a custom handler', () => {
		const template = 'Hello, {name}!'
		const result = interpolate(template, (context) => {
			expect(context.braceCount).toBe(1)
			expect(context.value).toBe('name')
			expect(context.pipeValues).toBeUndefined()
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
			expect(context.pipeValues).toBe('format')
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
			expect(context.value).toBe('outer{inner}')
			return 'replaced'
		})
		expect(result).toBe('replaced')
	})

	it('should handle pipe character with empty format string', () => {
		const template = '{value|}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value')
			expect(context.pipeValues).toBe([])
			return 'formatted'
		})
		expect(result).toBe('formatted')
	})

	// Additional tests for special character edge cases
	it('should handle pipe character in value', () => {
		const template = '{value|with|pipe|format}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value')
			expect(context.pipeValues).toMatchObject(['with', 'pipe', 'format'])
			return 'processed'
		})
		expect(result).toBe('processed')
	})

	it('should handle brace characters in format string', () => {
		const template = '{value|format{with}braces}'
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value')
			expect(context.pipeValues).toBe('format{with}braces')
			return 'processed'
		})
		expect(result).toBe('processed')
	})

	it('should handle adjacent interpolations with no space', () => {
		const template = '{one}{two}{three}'
		let callCount = 0
		const result = interpolate(template, (context) => {
			callCount++
			if (context.value === 'one') return 'A'
			if (context.value === 'two') return 'B'
			if (context.value === 'three') return 'C'
			return ''
		})
		expect(result).toBe('ABC')
		expect(callCount).toBe(3)
	})

	it('should handle escaped pipe character in value', () => {
		const template = String.raw`{something\|else}`
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('something|else')
			return 'processed'
		})
		expect(result).toBe('processed')
	})

	it('should handle escaped braces inside interpolation', () => {
		const template = String.raw`{value\{with\}braces}`
		const result = interpolate(template, (context) => {
			expect(context.value).toBe('value{with}braces')
			return 'processed'
		})
		expect(result).toBe('processed')
	})
})
