import type { Locale } from 'date-fns'
import is from '@sindresorhus/is'
import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import * as locales from 'date-fns/locale'
import type { TimeZone } from './time-zone'

/**
 * Tries to format and value as a date using date-fns-tz
 * @see https://date-fns.org/v4.1.0/docs/format
 * @see https://github.com/marnusw/date-fns-tz#formatintimezone
 * @param value - any value which might actually be a date
 * @param format - date-fns format string, will be validated
 * @param timeZone - IANA time zone string (e.g., 'America/New_York', 'Europe/London', 'UTC')
 * @param localeId - Optional BCP 47 locale identifier string (e.g., "en-US", "fr", "ja"). Defaults to 'en-US' if omitted or load fails.
 * @returns string - The formatted date string.
 * @throws {Error} If the date value is invalid, format string is invalid, timezone is invalid, or formatting fails unexpectedly.
 */
export function formatDate(
	value: unknown,
	format: string,
	timeZone?: TimeZone,
	localeId?: string, // Accept BCP 47 string, optional
): string {
	// Use parseISO instead of new Date() to avoid timezone issues
	// new Date('2025-04-11') // 2025-04-11T00:00:00.000Z
	// parseISO('2025-04-11') // 2025-04-11T04:00:00.000Z
	const dateValueLocal = is.date(value) ? value : parseISO(String(value))

	if (!is.validDate(dateValueLocal)) {
		throw new Error(`Invalid date: ${String(value)}`)
	}

	if (!isDateFnsFormatString(format)) {
		throw new Error(`Invalid date format string: ${format}`)
	}

	// eslint-disable-next-line ts/no-unsafe-type-assertion
	timeZone ??= Intl.DateTimeFormat().resolvedOptions().timeZone as TimeZone
	localeId ??= Intl.DateTimeFormat().resolvedOptions().locale

	// Change to target time zone, if applicable...
	// This might throw
	const result = formatInTimeZone(dateValueLocal, timeZone, format, {
		locale: getLocaleObject(localeId),
	})

	// Rare, legacy strategy where date-fns returns the format string
	// instead of the formatted date if the format string is invalid
	// or just extra template text
	if (result === format) {
		throw new Error(
			`Formatting resulted in the original format string: ${format}. Check format string validity.`,
		)
	}

	return result
}

// Spell-checker: disable
// eslint-disable-next-line regexp/prefer-range
const DATE_FNS_FORMAT_CHARS_REGEX = /^[abBcdDeEfFGhHiIkKLmMNoOpPqQrRsStTuUVwxXyYzZ':\-+/\\\s.,]+$/
// Spell-checker: enable

/**
 * Check if a string is a valid date-fns format string (basic check).
 * @see https://date-fns.org/v4.1.0/docs/format#
 */
export function isDateFnsFormatString(input: string): boolean {
	return DATE_FNS_FORMAT_CHARS_REGEX.test(input)
}

/**
 * Map a BCP 47 locale tag (e.g. "en-US", "pt-br", "zh-Hant-TW")
 * to the date‑fns locale key style:
 *  - language only → "en"
 *  - language + region → "enUS", "ptBR", "zhTW"
 */
const BCP47_SEPARATOR_REGEX = /[-_]/
const REGION_SUBTAG_REGEX = /^[A-Z]{2}$/i
const SCRIPT_SUBTAG_REGEX = /^[A-Z]{4}$/i

function bcp47ToDateFnsKey(tag: string): string {
	const parts = tag.split(BCP47_SEPARATOR_REGEX)
	const language = parts[0].toLowerCase()

	let script: string | undefined
	let region: string | undefined

	for (let i = 1; i < parts.length; i++) {
		const p = parts[i]
		if (REGION_SUBTAG_REGEX.test(p)) {
			// Region sub tag (2 letters)
			region = p.toUpperCase()
			break
		}
		if (!script && SCRIPT_SUBTAG_REGEX.test(p)) {
			// Script sub tag (4 letters)
			script = p[0].toUpperCase() + p.slice(1).toLowerCase()
		}
	}

	if (region) {
		return language + region
	}
	if (script) {
		return language + script
	}
	return language
}

/**
 * Attempts to load a date-fns Locale object based on a BCP 47 string.
 * @param localeId - The BCP 47 locale identifier (e.g., "en-US", "fr", "ja").
 * @returns The Locale object or the default locale (enUS) if loading fails.
 */
function getLocaleObject(localeId: string): Locale {
	const localeKey = bcp47ToDateFnsKey(localeId)

	// Check if the locale is available in the statically imported locales
	if (localeKey in locales) {
		return (locales as Record<string, Locale>)[localeKey]
	}
	// Use default
	return locales.enUS // Fallback to enUS if not found
}
