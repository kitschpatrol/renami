import isAbsolutePath from '@stdlib/assert-is-absolute-path'
import path from 'path-browserify-esm'
import slash from 'slash'
import log from './log'

export type PathObject = path.PathObject

/**
 * The browserify polyfill doesn't implement win32 absolute path detection...
 * @param filePath Normalized path
 * @returns Whether the path is absolute
 */
export function isAbsolute(filePath: string): boolean {
	return isAbsolutePath.posix(filePath) || isAbsolutePath.win32(filePath)
}

const RE_WINDOWS_EXTENDED_LENGTH_PATH = /^\\\\\?\\.+/

// Unused
// const RE_WINDOWS_UNC_PATH = /^\\\\[^\\]+\\[^\\]+/

/**
 * Converts all paths to cross-platform 'mixed' style with forward slashes.
 * Warns on unsupported Windows extended length paths.
 * @param filePath Path to normalize
 * @returns normalized path
 */
export function normalize(filePath: string): string {
	if (RE_WINDOWS_EXTENDED_LENGTH_PATH.test(filePath)) {
		log.warn(`Unsupported extended length path detected: ${filePath}`)
		return filePath
	}

	// If (RE_WINDOWS_UNC_PATH.test(filePath)) {
	// 	log.warn(`Unsupported UNC path detected: ${filePath}`)
	// 	return path.normalize(filePath)
	// }

	const basicPath = slash(filePath)
	const normalizedPath = path.normalize(basicPath)

	// Tricky cases where we still want leading './' to distinguish between relative and "named"" paths,
	// otherwise it's stripped by normalization
	if (basicPath.startsWith('./')) {
		return `./${normalizedPath}`
	}

	return normalizedPath
}

/**
 * Special handling for `/absolute-path.md` style links in Obsidian
 * and static site generators, where absolute paths are relative to a base path
 * instead of the volume root.
 *
 * Paths starting with Windows drive letters, while technically absolute, are _not_ prepended with the base:
 * - If no base path is provided, paths are resolved relative to the the provided CWD.
 * - If paths are relative, the base paths are ignored and the CWD is used.
 *
 * All path values are normalized and in 'mixed' platform style.
 */
export function resolveWithBasePath(
	filePath: string,
	options: {
		/** Relative, absolute, or drive-letter absolute path. Normalized and in the 'mixed' platform style. */
		basePath?: string | undefined
		/** Whether to keep prepend the base if the file path already starts with it. Useful for pseudo-idempotence, but will get it wrong in some edge cases with duplicative path segments. Defaults to false. */
		compoundBase?: boolean | undefined
		/** Relative to the volume root. Normalized and in the 'mixed' platform style. */
		cwd: string
	},
): string {
	// Prep options
	const { basePath, compoundBase = false, cwd } = options

	// Validation
	if (basePath !== undefined) {
		if (!isAbsolute(basePath)) {
			log.warn(`Base path "${basePath}" is not absolute`)
		}

		if (!cwd.startsWith(basePath)) {
			log.warn(`CWD "${cwd}" does not start with base path "${basePath}"`)
		}
	}

	if (!isAbsolute(cwd)) {
		log.warn(`CWD "${cwd}" is not absolute`)
	}

	// Absolute
	if (isAbsolute(filePath)) {
		// Path is absolute by drive letter on Windows, or there's not base path to prepend
		if (
			basePath === undefined ||
			/^[A-Z]:/i.test(filePath) ||
			(!compoundBase && filePath.startsWith(basePath))
		) {
			return filePath
		}

		// Resolve over base
		return path.join(basePath, filePath)
	}

	// Relative
	return path.join(cwd, filePath)
}

/**
 * Works around base not updating when changing the name or extension.
 */
export function pathObjectToString(pathObject: PathObject): string {
	pathObject.base = `${pathObject.name}${pathObject.ext}`
	return path.format(pathObject)
}
