import { deepmerge } from 'deepmerge-ts'
import path from 'path-browserify-esm'
import {
	caseTransform,
	safeTransform,
	stripIncrementTransform,
	type Transform,
	truncateTransform,
} from './transforms/core'
import { exists, type FileAdapter, getDefaultFileAdapter } from './utilities/file'
import { appendFilenameIncrement, getTemporarilyUniqueFilePath } from './utilities/filenames'
import log from './utilities/log'
import { isAbsolute, normalize } from './utilities/path'

path.parse('')

type PathObject = path.PathObject

function localeSort(a: PathObject, b: PathObject): number {
	return path.format(a).localeCompare(path.format(b))
}

const defaultRenameOptions: RenameOptions = {
	caseType: 'preserve',
	defaultName: 'Untitled',
	dryRun: false,
	fileAdapter: undefined, // Must be passed in later, deepmerge will not work
	maxLength: 255,
	sort: undefined, // Must be passed in later, deepmerge will not work?
	truncateOnWordBoundary: true,
	truncationString: '...',
	verbose: false,
}

type RenameOptions = {
	caseType:
		| 'camel'
		| 'kebab'
		| 'lowercase'
		| 'pascal'
		| 'preserve'
		| 'snake'
		| 'title'
		| 'uppercase'
	defaultName: string
	dryRun: boolean
	fileAdapter: FileAdapter | undefined
	maxLength: number
	sort: ((a: PathObject, b: PathObject, fileAdapter?: FileAdapter) => number) | undefined
	truncateOnWordBoundary: boolean
	truncationString: string
	verbose: boolean
}

type FileRenameTask = {
	filePathIntermediate: string | undefined
	filePathOriginal: string
	filePathRenamed: string | undefined
	status: 'conflict' | 'error' | 'renamed' | 'scheduled' | 'unchanged'
}

type FileRenameReport = {
	dryRun: boolean
	duration: number
	files: Array<Omit<FileRenameTask, 'filePathIntermediate'>>
}

type FilePathValidationStatus =
	| 'empty'
	| 'nonexistent'
	| 'not-absolute'
	| 'not-normalized'
	| 'not-string'
	| 'valid'

async function validateFilePath(
	filePath: string,
	fileAdapter: FileAdapter,
): Promise<FilePathValidationStatus> {
	if (typeof filePath !== 'string') {
		return 'not-string'
	}

	if (filePath.length === 0) {
		return 'empty'
	}

	const normalized = normalize(filePath)
	if (normalized !== filePath) {
		return 'not-normalized'
	}

	if (!isAbsolute(filePath)) {
		return 'not-absolute'
	}

	if (await exists(filePath, fileAdapter)) {
		return 'nonexistent'
	}

	return 'valid'
}

/**
 * Rename files based on the provided options.
 */
// eslint-disable-next-line complexity
export async function renameFiles(
	/** Expects unique, normalized, absolute paths! */
	filePaths: string[],
	transforms: Transform[],
	options?: Partial<RenameOptions>,
): Promise<FileRenameReport> {
	const startTime = performance.now()

	const {
		caseType,
		defaultName,
		dryRun,
		fileAdapter = await getDefaultFileAdapter(),
		maxLength,
		sort = localeSort,
		truncateOnWordBoundary,
		truncationString,
	} = deepmerge(defaultRenameOptions, options ?? {})

	const fileRenamePlan: FileRenameTask[] = []

	// Validate and build the rename plan
	let invalidFilesFound = false
	for (const filePath of filePaths) {
		const validationStatus = await validateFilePath(filePath, fileAdapter)

		if (validationStatus === 'valid') {
			fileRenamePlan.push({
				filePathIntermediate: undefined,
				filePathOriginal: filePath,
				filePathRenamed: undefined,
				status: 'scheduled', // Will be tested for later once we know the final file name
			})
		} else {
			invalidFilesFound = true
			// TODO better error names based on type
			log.error(`Invalid file path: ${filePath}`)
		}
	}

	// Check for duplicate entries among the valid paths
	const filePathMap = new Map<string, number>()
	for (const task of fileRenamePlan) {
		const count = filePathMap.get(task.filePathOriginal) ?? 0
		if (count > 0) {
			log.error(`Duplicate file path: ${task.filePathOriginal}`)
			invalidFilesFound = true
		}
		filePathMap.set(task.filePathOriginal, count + 1)
	}

	if (invalidFilesFound) {
		throw new Error('Invalid file paths found')
	}

	// Sort the paths based on original file names
	fileRenamePlan.sort((a, b) =>
		sort(path.parse(a.filePathOriginal), path.parse(b.filePathOriginal), fileAdapter),
	)

	// Run the action function on each valid file and update its file path renamed value
	for (const task of fileRenamePlan) {
		// May contain trailing increments, like (1)!
		const pathObject = path.parse(task.filePathOriginal)
		let newName: string | undefined

		// Run user-provided actions, in order, until one returns a new file name
		for (const transform of transforms) {
			newName = await transform(pathObject, { fileAdapter })
			if (newName !== undefined) {
				break
			}
		}

		// Default to the original file name if no action returned a new name
		newName ??= pathObject.name
		pathObject.name = newName

		// Run the built in actions
		pathObject.name = await safeTransform(pathObject, {
			defaultEmptyFilename: defaultName,
		})

		pathObject.name = await stripIncrementTransform(pathObject)

		pathObject.name = await caseTransform(pathObject, {
			caseType,
		})

		pathObject.name = await truncateTransform(pathObject, {
			fileSystemMaxLength: Number.MAX_SAFE_INTEGER, // TODO: Get from platform...
			maxLength,
			truncateOnWordBoundary,
			truncationString,
		})

		task.filePathRenamed = path.format(pathObject)
	}

	// Sort the paths again based on the new file names
	fileRenamePlan.sort((a, b) =>
		localeSort(path.parse(a.filePathRenamed!), path.parse(b.filePathRenamed!)),
	)

	// Find duplicates that need to be incremented
	const duplicateGroups: FileRenameTask[][] = []
	for (const [index, task] of fileRenamePlan.entries()) {
		if (task.filePathRenamed === undefined) {
			throw new Error('Renamed file path is undefined')
		}

		const duplicateGroup = [task]

		// Look forward for duplicates, we're trusting in the sort
		for (let i = index + 1; i < fileRenamePlan.length; i++) {
			const nextTask = fileRenamePlan[i]
			if (nextTask.filePathRenamed === task.filePathRenamed) {
				duplicateGroup.push(nextTask)
			}
		}

		if (duplicateGroup.length > 1) {
			// TODO sort based on original file name so that the increment is consistent?

			duplicateGroups.push(duplicateGroup)
		}
	}

	// Increment duplicates, truncating first to make room for the increment
	for (const group of duplicateGroups) {
		const maxLengthWithIncrement = maxLength - ` (${group.length.toString().length})`.length
		for (const [index, task] of group.entries()) {
			const pathObject = path.parse(task.filePathRenamed!)

			// Truncate to make room for the increment
			pathObject.name = await truncateTransform(pathObject, {
				fileSystemMaxLength: Number.MAX_SAFE_INTEGER, // TODO: Get from platform...
				maxLength: maxLengthWithIncrement,
				truncateOnWordBoundary,
				truncationString,
			})

			appendFilenameIncrement(pathObject.name, index + 1)
		}
	}

	// Check for conflicts between original and final paths, setting intermediate file name if needed
	for (const task of fileRenamePlan) {
		for (const otherTask of fileRenamePlan) {
			if (task === otherTask) {
				continue
			}

			if (task.filePathRenamed === otherTask.filePathOriginal) {
				task.filePathIntermediate = getTemporarilyUniqueFilePath()
				break
			}
		}
	}

	// Sort the paths based on final filenames
	fileRenamePlan.sort((a, b) =>
		sort(path.parse(a.filePathRenamed!), path.parse(b.filePathRenamed!), fileAdapter),
	)

	// Checking for conflicts with existing files!
	for (const task of fileRenamePlan) {
		if (task.filePathIntermediate !== undefined) {
			// The existing file is going to be overwritten, not a file outside the provided set
			continue
		}

		if (await exists(task.filePathRenamed!, fileAdapter)) {
			task.status = 'conflict'
		}
	}

	// First do a pass for the intermediate files
	for (const task of fileRenamePlan) {
		const { filePathIntermediate, filePathOriginal, status } = task
		if (status === 'scheduled' && filePathIntermediate !== undefined) {
			try {
				if (dryRun) {
					log.info(`Would rename ${filePathOriginal} to ${filePathIntermediate}`)
				} else {
					await fileAdapter.rename(filePathOriginal, filePathIntermediate)
				}
			} catch {
				log.error(`Error renaming ${filePathOriginal} to ${filePathIntermediate}`)
				task.status = 'error'
			}
		}
	}

	// Now do a pass for the final files
	for (const task of fileRenamePlan) {
		const { filePathIntermediate, filePathOriginal, filePathRenamed, status } = task
		if (status === 'scheduled') {
			const sourcePath = filePathIntermediate ?? filePathOriginal

			if (sourcePath === filePathRenamed) {
				task.status = 'unchanged'
				continue
			}

			try {
				if (dryRun) {
					log.info(`Would rename ${sourcePath} to ${filePathRenamed}`)
				} else {
					await fileAdapter.rename(sourcePath, filePathRenamed!)
				}
				task.status = 'renamed'
			} catch {
				task.status = 'error'
			}
		}
	}

	// Return a report
	return {
		dryRun,
		duration: performance.now() - startTime,
		files: fileRenamePlan.map(({ filePathIntermediate, ...rest }) => rest),
	}
}
