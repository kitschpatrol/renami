import filenamify from 'filenamify'
import { nanoid } from 'nanoid'
import path from 'path-browserify-esm'

// TODO platform-specific?
export const FILENAME_MAX_LENGTH = 255
const TEMPORARY_ID_LENGTH = 8

/**
 * Ensures that the filename is filesystem-safe and Unicode normalized
 * @param text Text to be converted to a safe filename, just the extension-less name NOT the full path
 * @returns A safe filename
 */
export function getSafeFilename(text: string, defaultEmptyFilename = 'Untitled'): string {
	let basicSafeFilename = filenamify(text.trim(), {
		maxLength: Number.MAX_SAFE_INTEGER,
		replacement: ' ',
	})
		.replaceAll(/\s+/g, ' ')
		.trim()

	// Edge case where the filename is empty after invalid characters are removed
	if (basicSafeFilename.length === 0) {
		basicSafeFilename = defaultEmptyFilename
	}

	// Unicode normalization
	// https://github.com/kitschpatrol/yanki-obsidian/issues/13
	basicSafeFilename = basicSafeFilename.normalize('NFC')

	return basicSafeFilename
}

/**
 * Strip the trailing increment from a filename
 * @param filename File name with or without an extension, and possibly with a (1)
 * @returns filename without the increment
 */
export function stripFilenameIncrement(filename: string): string {
	// Don't mistake '... (1)' suffixes for extensions
	// TODO make this less precarious
	const validExtension =
		filename.endsWith('.') || filename.endsWith(')') ? undefined : path.extname(filename)

	const strippedBaseNameWithoutExtension = path
		.basename(filename, validExtension)
		.replace(/\s\(\d+\)$/, '')
	return path.join(
		path.dirname(filename),
		`${strippedBaseNameWithoutExtension}${validExtension ?? ''}`,
	)
}

/**
 * Strip the trailing increment from a filename
 * @param filename File name without an extension
 * @returns filename without the increment
 */
export function appendFilenameIncrement(filename: string, value: number): string {
	return `${filename} (${value})`
}

/**
 * Get a temporary file name that is unique
 */
export function getTemporarilyUniqueFilePath(): string {
	return nanoid(TEMPORARY_ID_LENGTH)
}

// Not needed
// export function stripTemporarilyUniqueFilePath(filePath: string): string {
// 	return filePath.slice(0, -9)
// }
