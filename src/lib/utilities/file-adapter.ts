import is from '@sindresorhus/is'
import { z } from 'zod'
import { ENVIRONMENT } from './platform'

export type FileAdapter = {
	readFile(filePath: string): Promise<string>
	// Simpler than making the user implement overloads
	readFileBuffer(filePath: string): Promise<Uint8Array>
	rename(oldPath: string, newPath: string): Promise<void>
	stat(filePath: string): Promise<{
		// Require only the fields we can also get in Obsidian
		ctimeMs: number // Time of creation, represented as a unix timestamp, in milliseconds.
		mtimeMs: number // Time of last modification, represented as a unix timestamp, in milliseconds.
		size: number // Size on disk, as bytes.
	}>
	writeFile(filePath: string, data: string): Promise<void> // Not used, yet
}

/**
 * Zod schema for FileAdapter, validates that the value has the expected function properties.
 * @public
 */
export const FileAdapterSchema = z.custom<FileAdapter>((value) => {
	if (!is.plainObject(value)) return false
	return (
		is.function(value.readFile) &&
		is.function(value.readFileBuffer) &&
		is.function(value.rename) &&
		is.function(value.stat) &&
		is.function(value.writeFile)
	)
})

/**
 * Wrapper around the file system stat function to check if a file exists.
 */
export async function exists(filePath: string, fileAdapter: FileAdapter): Promise<boolean> {
	try {
		await fileAdapter.stat(filePath)
		return true
	} catch {
		return false
	}
}

/**
 * Get the default file adapter for the current environment. Non-node
 * environments will have to provide their own implementations.
 *
 * This is done mostly for ease of implementation with Obsidian's plugin API.
 */
export async function getDefaultFileAdapter(): Promise<FileAdapter> {
	if (ENVIRONMENT === 'node') {
		// TODO memoize
		const nodeFs = await import('node:fs/promises')
		// eslint-disable-next-line ts/no-unnecessary-condition
		if (nodeFs === undefined) {
			throw new Error('Error loading file functions in Node environment')
		}

		return {
			async readFile(filePath: string): Promise<string> {
				return nodeFs.readFile(filePath, 'utf8')
			},
			async readFileBuffer(filePath: string): Promise<Uint8Array> {
				return nodeFs.readFile(filePath)
			},
			async rename(oldPath: string, newPath: string): Promise<void> {
				await nodeFs.rename(oldPath, newPath)
			},
			async stat(filePath: string) {
				return nodeFs.stat(filePath)
			},
			async writeFile(filePath: string, data: string): Promise<void> {
				await nodeFs.writeFile(filePath, data, 'utf8')
			},
		}
	}

	throw new Error(
		'The "readFile", "readFileBuffer", "rename" , "stat", and "writeFile" function implementations must be provided to the function when running in the browser',
	)
}
