import { describe, expect, test } from 'vitest'
import { isDateFnsFormatString } from '../src/lib/utilities/date'
import { isNumerableFormatString } from '../src/lib/utilities/number'
import {
	appendIncrement,
	convertCase,
	css,
	emptyIsUndefined,
	getSafeFilename,
	getUnicodeCodePoints,
	html,
	markdown,
	md,
	stripIncrement,
	truncate,
} from '../src/lib/utilities/string'

describe('getSafeFilename', () => {
	test('returns safe filename by replacing invalid characters', () => {
		expect(getSafeFilename('file:name?with*invalid/chars')).not.toContain(':?*/')
		expect(getSafeFilename('file:name?with*invalid/chars')).toMatch(
			/file.+name.+with.+invalid.+chars/,
		)
	})

	test('returns default name when input is empty', () => {
		expect(getSafeFilename('')).toBe('Untitled')
	})

	test('handles custom default filename', () => {
		expect(getSafeFilename('', 'CustomDefault')).toBe('CustomDefault')
	})

	test('applies Unicode normalization', () => {
		// Create a string with a combining character that should be normalized
		const nonNormalizedString = 'cafe\u0301' // Café with combining acute accent
		const result = getSafeFilename(nonNormalizedString)

		// The result should be the NFC normalized form
		expect(result).toBe('café')
		// Check that the length is 4 characters (not 5 as in the original)
		expect(result.length).toBe(4)
	})

	test('returns safe filename for strings with purely invalid characters', () => {
		// This string contains only characters that would be replaced
		expect(getSafeFilename('?*:|<>/\\')).toBe('Untitled')
	})

	test('preserves case when sanitizing', () => {
		const mixedCase = 'File-NAME_example'
		expect(getSafeFilename(mixedCase)).toMatch(/File-NAME_example/)
	})
})

describe('truncate', () => {
	test('returns original string when it is shorter than maxLength', () => {
		expect(truncate('hello', 10, 100, false, true)).toBe('hello')
	})

	test('truncates string to maxLength with default truncation string', () => {
		expect(truncate('hello world', 8, 100, false, true)).toBe('hello...')
	})

	test('respects fileSystemMaxLength when it is smaller than maxLength', () => {
		expect(truncate('hello world', 10, 7, false, true)).toBe('hell...')
	})

	test('returns just truncation string when maxLength equals truncation string length', () => {
		expect(truncate('hello', 3, 100, false, true)).toBe('...')
	})

	test('handles custom truncation string', () => {
		expect(truncate('hello world', 8, 100, false, true, '…')).toBe('hello w…')
	})

	test('returns truncation string when safeMaxLength is 0', () => {
		expect(truncate('hello', 3, 3, false, true)).toBe('...')
	})

	test('truncates string when truncation string is shorter than maxLength', () => {
		expect(truncate('hello world', 8, 100, false, false, '..')).toBe('hello ..')
	})

	test('handles edge case with very long truncation string', () => {
		const longTruncation = '...............'
		expect(truncate('hello', 5, 10, false, true, longTruncation)).toBe('.....')
	})

	test('truncates at word boundary when truncateOnWordBoundary is true', () => {
		expect(truncate('hello world', 10, 100, true, true)).toBe('hello...')
	})

	test('handles camelCase boundaries when exact length', () => {
		expect(truncate('helloWorld', 10, 100, true, true)).toBe('helloWorld')
	})

	test('handles near break max length when truncateOnWordBoundary is true', () => {
		expect(truncate('helloWorld', 7, 100, true, true)).toBe('hell...')
	})

	test('handles break and truncation string summing to maxlength when truncateOnWordBoundary is true', () => {
		expect(truncate('helloWorld', 8, 100, true, true)).toBe('hello...')
	})

	test('handles one more than break max length when truncateOnWordBoundary is true', () => {
		expect(truncate('helloWorld', 9, 100, true, true)).toBe('hello...')
	})

	test('handles hyphen boundaries when truncateOnWordBoundary is true', () => {
		expect(truncate('hello-world', 10, 100, true, true)).toBe('hello...')
	})

	test('truncates at period delimiter when truncateOnWordBoundary is true', () => {
		expect(truncate('hello.world', 10, 100, true, true)).toBe('hello...')
	})

	test('truncates at underscore delimiter when truncateOnWordBoundary is true', () => {
		expect(truncate('hello_world', 10, 100, true, true)).toBe('hello...')
	})

	test('truncates at original position if no word boundary found within search range', () => {
		const longWord = 'supercalifragilisticexpialidocious'
		expect(truncate(longWord, 8, 100, true, true)).toBe('super...')
	})
})

describe('emptyIsUndefined', () => {
	test('returns undefined when input is undefined', () => {
		expect(emptyIsUndefined()).toBeUndefined()
	})

	test('returns undefined when input is empty string', () => {
		expect(emptyIsUndefined('')).toBeUndefined()
	})

	test('returns undefined when input is whitespace only', () => {
		expect(emptyIsUndefined('  ')).toBeUndefined()
		expect(emptyIsUndefined('\t\n')).toBeUndefined()
	})

	test('returns original string when input has content', () => {
		expect(emptyIsUndefined('hello')).toBe('hello')
		expect(emptyIsUndefined(' hello ')).toBe(' hello ')
	})

	test('handles strings with only non-space whitespace characters', () => {
		expect(emptyIsUndefined('\t\r\n')).toBeUndefined()
	})

	test('preserves strings that contain whitespace and non-whitespace', () => {
		expect(emptyIsUndefined(' a ')).toBe(' a ')
		expect(emptyIsUndefined('\thello\n')).toBe('\thello\n')
	})
})

describe('template tag functions', () => {
	test('markdown function trims leading indentation', () => {
		const result = markdown`
			# Heading

			Some content

			- Indented bullet
		`
		expect(result).toBe('# Heading\n\nSome content\n\n- Indented bullet')
	})

	test('md function works the same as markdown', () => {
		const mdResult = md`
			# Heading

			Some content
		`
		const markdownResult = markdown`
			# Heading

			Some content
		`
		expect(mdResult).toBe(markdownResult)
	})

	test('html function trims leading indentation', () => {
		const result = html`
			<div>
				<p>Content</p>
			</div>
		`
		expect(result).toBe('<div>\n  <p>Content</p>\n</div>')
	})

	test('css function trims leading indentation', () => {
		const result = css`
			.class {
				color: blue;
			}
		`
		expect(result).toBe('.class {\n  color: blue;\n}')
	})

	test('template functions handle values correctly', () => {
		const name = 'World'
		const result = markdown`
      # Hello ${name}
      Welcome!
    `
		expect(result).toBe('# Hello World\nWelcome!')
	})

	test('template functions handle multiple values', () => {
		const name = 'World'
		const greeting = 'Hello'
		const result = markdown`
      # ${greeting} ${name}
      Welcome!
    `
		expect(result).toBe('# Hello World\nWelcome!')
	})

	test('template functions preserve indentation relative to first line', () => {
		const result = markdown`
			# Heading

			This line is indented
			This line is more indented
		`
		expect(result).toBe('# Heading\n\nThis line is indented\nThis line is more indented')
	})

	test('template functions handle empty lines', () => {
		const result = markdown`
			# Heading

			Paragraph after empty line
		`
		expect(result).toBe('# Heading\n\nParagraph after empty line')
	})
})

describe('convertCase', () => {
	const testString = 'hello World-example_string'

	test('preserves original case', () => {
		expect(convertCase(testString, 'preserve')).toBe(testString)
	})

	test('converts to lowercase', () => {
		expect(convertCase(testString, 'lowercase')).toBe('hello world-example_string')
	})

	test('converts to uppercase', () => {
		expect(convertCase(testString, 'uppercase')).toBe('HELLO WORLD-EXAMPLE_STRING')
	})

	test('converts to camelCase', () => {
		expect(convertCase(testString, 'camel')).toBe('helloWorldExampleString')
	})

	test('converts to kebab-case', () => {
		expect(convertCase(testString, 'kebab')).toBe('hello-world-example-string')
	})

	test('converts to PascalCase', () => {
		expect(convertCase(testString, 'pascal')).toBe('HelloWorldExampleString')
	})

	test('converts to SCREAMING-KEBAB-CASE', () => {
		expect(convertCase(testString, 'screaming-kebab')).toBe('HELLO-WORLD-EXAMPLE-STRING')
	})

	test('converts to SCREAMING_SNAKE_CASE', () => {
		expect(convertCase(testString, 'screaming-snake')).toBe('HELLO_WORLD_EXAMPLE_STRING')
	})

	test('converts to Sentence case', () => {
		expect(convertCase(testString, 'sentence')).toBe('Hello world example string')
	})

	test('converts to snake_case', () => {
		expect(convertCase(testString, 'snake')).toBe('hello_world_example_string')
	})

	test('converts to Title Case', () => {
		expect(convertCase(testString, 'title')).toBe('Hello World Example String')
	})

	test('handles title case with small words', () => {
		expect(convertCase('this is a test for the title case', 'title')).toBe(
			'This Is a Test for the Title Case',
		)
	})

	test('handles empty string', () => {
		expect(convertCase('', 'camel')).toBe('')
	})

	test('handles sentence case with no spaces', () => {
		expect(convertCase('helloworld', 'sentence')).toBe('Helloworld')
	})

	test('handles camelCase to kebab conversion correctly', () => {
		expect(convertCase('helloWorldExample', 'kebab')).toBe('hello-world-example')
	})

	test('handles PascalCase to snake conversion correctly', () => {
		expect(convertCase('HelloWorldExample', 'snake')).toBe('hello_world_example')
	})

	test('handles title case first and last word capitalization rule', () => {
		expect(convertCase('the quick brown fox jumps over the lazy dog', 'title')).toBe(
			'The Quick Brown Fox Jumps Over the Lazy Dog',
		)
	})

	test('converts to slug format', () => {
		expect(convertCase(testString, 'slug')).toBe('hello-world-example_string')
	})

	test('handles special characters in slug conversion', () => {
		expect(convertCase('Hello World! Special & Characters?', 'slug')).toBe(
			'hello-world-special--characters',
		)
	})

	test('handles multiple adjacent special characters in slug conversion', () => {
		expect(convertCase('Hello!!!World???', 'slug')).toBe('helloworld')
	})

	test('handles accented characters in slug conversion', () => {
		expect(convertCase('Café Français', 'slug')).toBe('café-français')
	})

	test('handles emojis in slug conversion', () => {
		expect(convertCase('Product Review ✌️😅', 'slug')).toBe('product-review-️')
	})
})

describe('getUnicodeCodePoints', () => {
	test('returns code points for ASCII characters', () => {
		expect(getUnicodeCodePoints('AB')).toEqual(['41', '42'])
	})

	test('returns code points for emoji', () => {
		expect(getUnicodeCodePoints('😊')).toEqual(['1f60a'])
	})

	test('returns code points for mixed content', () => {
		expect(getUnicodeCodePoints('a😊b')).toEqual(['61', '1f60a', '62'])
	})

	test('handles empty string', () => {
		expect(getUnicodeCodePoints('')).toEqual([])
	})

	test('handles complex emojis correctly', () => {
		// Family emoji (may be a single grapheme but multiple code points)
		expect(getUnicodeCodePoints('👨‍👩‍👧‍👦')).toEqual([
			'1f468',
			'200d',
			'1f469',
			'200d',
			'1f467',
			'200d',
			'1f466',
		])
	})

	test('handles combining characters correctly', () => {
		// E with acute accent as a combining character
		expect(getUnicodeCodePoints('é')).toEqual(['e9'])

		// E with combining acute accent
		expect(getUnicodeCodePoints('e\u0301')).toEqual(['65', '301'])
	})

	test('handles special Unicode characters', () => {
		// Zero-width joiner
		expect(getUnicodeCodePoints('\u200D')).toEqual(['200d'])

		// Non-breaking space
		expect(getUnicodeCodePoints('\u00A0')).toEqual(['a0'])
	})

	test('handles multi-code point characters', () => {
		// Characters that require more than 16 bits (outside BMP)
		expect(getUnicodeCodePoints('𐐷')).toEqual(['10437'])
	})
})

describe('stripIncrement', () => {
	test('removes trailing increment from filename without extension', () => {
		expect(stripIncrement('document (1)')).toBe('document')
	})

	test('does not modify filename without increment', () => {
		expect(stripIncrement('document')).toBe('document')
	})

	test('handles filenames that contain parentheses elsewhere', () => {
		expect(stripIncrement('document (old) (1)')).toBe('document (old)')
	})

	test('handles multi-digit increments', () => {
		expect(stripIncrement('document (123)')).toBe('document')
	})

	test('does not modify filename with parentheses not containing numbers', () => {
		expect(stripIncrement('document (abc)')).toBe('document (abc)')
	})

	test('does not modify filename with parentheses containing non-trailing numbers', () => {
		expect(stripIncrement('document (1) suffix')).toBe('document (1) suffix')
	})
})

describe('appendIncrement', () => {
	test('appends increment to filename', () => {
		expect(appendIncrement('document', 1)).toBe('document (1)')
	})

	test('appends different increment value', () => {
		expect(appendIncrement('document', 42)).toBe('document (42)')
	})

	test('works with empty string', () => {
		expect(appendIncrement('', 1)).toBe(' (1)')
	})

	test('works with already incremented filenames', () => {
		expect(appendIncrement('document (1)', 2)).toBe('document (1) (2)')
	})

	test('handles zero as increment', () => {
		expect(appendIncrement('document', 0)).toBe('document (0)')
	})
})

const validNumerablePatterns = [
	'(0,0.0)',
	'(0,0.00 $)',
	'+0,0.00',
	'$0,0.00',
	'0 %',
	'0,0-',
	'0,0.0',
	'0,0.00 %',
	'0,0.00 $',
	'0,0.00',
	'0,0.0000',
	'0,0.X',
	'0,0',
	'0,0+',
	'0.##%',
	'0.0',
	'0.0####',
	'0.00',
	'0.000',
	'0.000##',
	'0.00bb',
	'0.00bd',
	'0.0a',
	'0[.]00',
	'00:00:00',
	'00:00',
	'000.##',
	'0o',
	// Additional test cases for updated requirements
	'(0) [0]', // Both parentheses and brackets
	'  0  ', // Multiple spaces
	'[0]   (0)', // Brackets, parentheses and spaces
]

const invalidNumerablePatterns = [
	'abc', // No zeros
	'(0)(0]', // Mismatched brackets
	'0,0.00 y', // Invalid character 'y'
	'(0]', // Unbalanced parentheses/brackets
	'[0)', // Unbalanced parentheses/brackets
]

const validDateFnsPatterns = [
	'a..aa',
	'aaa',
	'aaaa',
	'aaaaa',
	'b..bb',
	'B..BBB',
	'bbb',
	'bbbb',
	'BBBB',
	'bbbbb',
	'BBBBB',
	'c',
	'cc',
	'ccc',
	'cccc',
	'ccccc',
	'cccccc',
	'co',
	'd',
	'D',
	'dd',
	'DD',
	'DDD',
	'DDDD',
	'do',
	'Do',
	'E..EEE',
	'e',
	'ee',
	'eee',
	'eeee',
	'EEEE',
	'eeeee',
	'EEEEE',
	'eeeeee',
	'EEEEEE',
	'eo',
	'G..GGG',
	'GGGG',
	'GGGGG',
	'h',
	'H',
	'hh',
	'HH',
	'ho',
	'Ho',
	'i',
	'I',
	'ii',
	'II',
	'iii',
	'iiii',
	'iiiii',
	'iiiiii',
	'io',
	'Io',
	'k',
	'K',
	'kk',
	'KK',
	'ko',
	'Ko',
	'L',
	'LL',
	'LLL',
	'LLLL',
	'LLLLL',
	'Lo',
	'm',
	'M',
	'mm',
	'MM',
	'MMM',
	'MMMM',
	'MMMMM',
	'mo',
	'Mo',
	'O...OOO',
	'OOOO',
	'p',
	'P',
	'pp',
	'Pp',
	'PP',
	'ppp',
	'PPP',
	'pppp',
	'PPpp',
	'PPPP',
	'PPPppp',
	'PPPPpppp',
	'q',
	'Q',
	'qo',
	'Qo',
	'qq',
	'QQ',
	'qqq',
	'QQQ',
	'qqqq',
	'QQQQ',
	'qqqqq',
	'QQQQQ',
	'R',
	'RR',
	'RRR',
	'RRRR',
	'RRRRR',
	's',
	'S',
	'so',
	'ss',
	'SS',
	'SSS',
	'SSSS',
	't',
	'T',
	'tt',
	'TT',
	'u',
	'uu',
	'uuu',
	'uuuu',
	'uuuuu',
	'w',
	'wo',
	'ww',
	'x',
	'X',
	'xx',
	'XX',
	'xxx',
	'XXX',
	'xxxx',
	'XXXX',
	'xxxxx',
	'XXXXX',
	'y',
	'Y',
	'yo',
	'Yo',
	'yy',
	'YY',
	'yyy',
	'YYY',
	'YYYY MM DD HH:mm:ss',
	'YYYY MM DD',
	'YYYY MM DDTHH:mm:ssZ',
	'YYYY-MM-DD HH:mm:ss',
	'YYYY-MM-DD',
	'YYYY-MM-DDTHH:mm:ssZ',
	'YYYY.MM.DD HH:mm:ss',
	'YYYY.MM.DD',
	'YYYY.MM.DDTHH:mm:ssZ',
	'yyyy',
	'YYYY',
	'YYYY/MM/DD HH:mm:ss',
	'YYYY/MM/DD',
	'YYYY/MM/DDTHH:mm:ssZ',
	'yyyyy',
	'YYYYY',
	'z...zzz',
	'zzzz',
]

describe('detect numerable format strings', () => {
	test.each(validNumerablePatterns)('should validate the pattern: %s', (pattern) => {
		expect(isNumerableFormatString(pattern)).toBe(true)
	})

	test.each(invalidNumerablePatterns)('should invalidate the pattern: %s', (pattern) => {
		expect(isNumerableFormatString(pattern)).toBe(false)
	})

	test.each(validDateFnsPatterns)('should invalidate the date-fns pattern: %s', (pattern) => {
		expect(isNumerableFormatString(pattern)).toBe(false)
	})

	// Testing specific requirements
	test('requires at least one zero', () => {
		expect(isNumerableFormatString('(.,)')).toBe(false)
		expect(isNumerableFormatString('(0)')).toBe(true)
	})

	test('validates balanced parentheses and brackets', () => {
		expect(isNumerableFormatString('(0')).toBe(false)
		expect(isNumerableFormatString('0)')).toBe(false)
		expect(isNumerableFormatString('[0')).toBe(false)
		expect(isNumerableFormatString('0]')).toBe(false)
		expect(isNumerableFormatString('(0)')).toBe(true)
		expect(isNumerableFormatString('[0]')).toBe(true)
		expect(isNumerableFormatString('(0) [0]')).toBe(true)
	})

	test('validates ending patterns', () => {
		expect(isNumerableFormatString('0%')).toBe(true)
		expect(isNumerableFormatString('0bb')).toBe(true)
		expect(isNumerableFormatString('0bd')).toBe(true)
		expect(isNumerableFormatString('0o')).toBe(true)
		expect(isNumerableFormatString('0a')).toBe(true)
		expect(isNumerableFormatString('0-')).toBe(true)
		expect(isNumerableFormatString('0+')).toBe(true)
		expect(isNumerableFormatString('0')).toBe(true)
		expect(isNumerableFormatString('0 ')).toBe(true)
		expect(isNumerableFormatString('(0)')).toBe(true)
		expect(isNumerableFormatString('[0]')).toBe(true)
	})
})

describe('detect date-fns format strings', () => {
	test.each(validDateFnsPatterns)('should validate the pattern: %s', (pattern) => {
		expect(isDateFnsFormatString(pattern)).toBe(true)
	})

	test.each(validNumerablePatterns)('should invalidate the numerable pattern: %s', (pattern) => {
		expect(isDateFnsFormatString(pattern)).toBe(false)
	})
})
