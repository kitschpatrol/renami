import is from '@sindresorhus/is'
import { format as dateFnsFormat } from 'date-fns'

/**
 * Try to format any value as a date using date-fns
 * @see https://date-fns.org/v4.1.0/docs/format
 * @param value - any value which might actually be a date
 * @param format - date-fns format string, will be validated
 * @returns string
 * @throws if the date could not be formatted
 */
export function formatDate(value: unknown, format: string): string {
	const dateValue = is.date(value) ? value : new Date(String(value))

	if (!is.validDate(dateValue)) {
		throw new Error(`Invalid date: ${String(value)}`)
	}
	if (!isDateFnsFormatString(format)) {
		throw new Error(`Invalid date format string: ${format}`)
	}

	// This might throw
	const result = dateFnsFormat(dateValue, format)

	// Rare, legacy strategy where date-fns returns the format string
	// instead of the formatted date if the format string is invalid
	// or just extra template text
	if (result === format) {
		throw new Error(`Invalid date format string: ${format}`)
	}

	return result
}

/**
 * Check if a string is a valid date-fns format string
 * @see https://date-fns.org/v4.1.0/docs/format#
 */
export function isDateFnsFormatString(input: string): boolean {
	// Check for allowed characters
	// spell-checker: disable
	// eslint-disable-next-line regexp/prefer-range
	return /^[abBcdDeEGhHiIkKLmMoOpPqQRsStTuwxXyYzZ':\\\-+/\s.,]+$/.test(input)
	//
	// spell-checker: enable
}
