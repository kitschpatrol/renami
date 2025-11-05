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
 * Zod schema for FileAdapter, satisfies instead of infers for cleaner type intellisense.
 */
export const FileAdapterSchema = z.object({
	readFile: z.function().args(z.string()).returns(z.promise(z.string())),
	readFileBuffer: z
		.function()
		.args(z.string())
		.returns(z.promise(z.custom<Uint8Array>((value) => value instanceof Uint8Array))),
	rename: z.function().args(z.string(), z.string()).returns(z.promise(z.void())),
	stat: z
		.function()
		.args(z.string())
		.returns(
			z.promise(
				z.object({
					// Require only the fields we can also get in Obsidian
					ctimeMs: z.number(), // Time of creation, represented as a unix timestamp, in milliseconds.
					mtimeMs: z.number(), // Time of last modification, represented as a unix timestamp, in milliseconds.
					size: z.number(), // Size on disk, as bytes.
				}),
			),
		),
	writeFile: z.function().args(z.string(), z.string()).returns(z.promise(z.void())), // Not used, yet
}) satisfies z.ZodType<FileAdapter>

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
