import path from 'path-browserify-esm'
import { type Transform } from '../transform'
import { type FileAdapter } from '../utilities/file'
import { type PathObject } from '../utilities/path'

/**
 * Generic callback function with access to the file being renamed
 * @param callback Function that takes file-related args and returns a string or undefined if no transform is possible. Can be sync or async.
 * @returns renami transform function
 */
export function fileCallback(
	callback: (
		filePath: PathObject,
		fileBuffer: Uint8Array,
		fileInfo: Awaited<ReturnType<FileAdapter['stat']>>,
	) => PathObject | Promise<PathObject | string | undefined> | string | undefined,
): Transform {
	return async ({ fileAdapter, filePath }) => {
		const fullPath = path.format(filePath)

		const [buffer, stat] = await Promise.all([
			fileAdapter.readFileBuffer(fullPath),
			fileAdapter.stat(fullPath),
		])

		const result = callback(filePath, buffer, stat)
		return result instanceof Promise ? result : result
	}
}
