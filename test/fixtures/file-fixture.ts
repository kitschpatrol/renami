import { globby } from 'globby'
// eslint-disable-next-line node/no-unsupported-features/node-builtins
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach } from 'vitest'

type TempFilesOptions = {
	/**
	 * Whether to clean up the temporary directory after tests
	 * @default true
	 */
	cleanup?: boolean

	/**
	 * Custom prefix for the temporary directory
	 * @default 'vitest-'
	 */
	prefix?: string

	/**
	 * Source directory path containing files to copy
	 */
	sourcePath: string
}

/**
 * Creates a fixture that copies files from a source path to a temporary directory
 * and provides the path to tests. Optionally cleans up after tests.
 */
export function useTempFiles(options: TempFilesOptions) {
	const { cleanup = true, prefix = 'vitest-', sourcePath } = options

	let tempDirectoryPath: string

	beforeEach(async () => {
		// Create temporary directory with provided prefix
		tempDirectoryPath = await mkdtemp(join(tmpdir(), prefix))

		// Copy all files from source to the temp directory
		await cp(sourcePath, tempDirectoryPath, { recursive: true })

		return { tempDirectoryPath }
	})

	afterEach(async () => {
		// Clean up the temporary directory if cleanup is enabled
		if (cleanup && tempDirectoryPath) {
			await rm(tempDirectoryPath, { force: true, recursive: true })
		}
	})

	return {
		/**
		 * Manually clean up the temporary directory
		 */
		async cleanup() {
			if (tempDirectoryPath) {
				await rm(tempDirectoryPath, { force: true, recursive: true })
			}
		},
		/**
		 * Gets the full path to all files within the temporary directory
		 */
		async getFiles() {
			return globby(`${tempDirectoryPath}/**/*`, {
				absolute: true,
				onlyFiles: true,
			})
		},
		/**
		 * Gets the path to the temporary directory
		 */
		getTempPath: () => tempDirectoryPath,
	}
}
