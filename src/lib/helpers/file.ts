import path from 'pathe'
import type { Transform } from '../transform'
import type { FileAdapter } from '../utilities/file-adapter'
import type { PathObject } from '../utilities/path'

/**
 * Generic callback function with access to the file being renamed
 * @param callback Function that takes file-related args and returns a string or
 * undefined if no transform is possible. Can be sync or async.
 * @returns Renami transform function
 */
export function fileCallback(
	callback: (file: {
		fileBuffer: Uint8Array
		fileInfo: Awaited<ReturnType<FileAdapter['stat']>>
		filePath: PathObject
	}) => PathObject | Promise<PathObject | string | undefined> | string | undefined,
): Transform {
	return async ({ fileAdapter, filePath }) => {
		const fullPath = path.format(filePath)

		const [fileBuffer, fileInfo] = await Promise.all([
			fileAdapter.readFileBuffer(fullPath),
			fileAdapter.stat(fullPath),
		])

		const result = callback({ fileBuffer, fileInfo, filePath })
		return result instanceof Promise ? result : result
	}
}
