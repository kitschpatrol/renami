/* eslint-disable max-depth */
import { deepmerge } from 'deepmerge-ts'
import { nanoid } from 'nanoid'
import { orderBy } from 'natural-orderby'
import path from 'path-browserify-esm'
import { defaultOptions, type Options } from './config'
import {
	caseTransform,
	safeTransform,
	stripIncrementTransform,
	type Transform,
	truncateTransform,
} from './transform'
import { exists, type FileAdapter, getDefaultFileAdapter } from './utilities/file'
import log from './utilities/log'
import { isAbsolute, normalize, pathObjectToString } from './utilities/path'
import { FILENAME_MAX_LENGTH } from './utilities/platform'
import { appendIncrement, convertCase, getIncrement } from './utilities/string'

type FileRenameTask = {
	filePathIntermediate: string | undefined
	filePathOriginal: string
	filePathRenamed: string | undefined
	status: 'conflict' | 'error' | 'renamed' | 'scheduled' | 'unchanged'
}

export type FileRenameReport = {
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

	if (!(await exists(filePath, fileAdapter))) {
		return 'nonexistent'
	}

	return 'valid'
}

function validationStatusMessage(status: FilePathValidationStatus): string {
	switch (status) {
		case 'empty': {
			return 'Empty file path'
		}
		case 'nonexistent': {
			return 'File does not exist'
		}
		case 'not-absolute': {
			return 'File path is not absolute'
		}
		case 'not-normalized': {
			return 'File path is not normalized'
		}
		case 'not-string': {
			return 'File path is not a string'
		}
		case 'valid': {
			return 'Valid file path'
		}
	}
}

async function validateFiles(filePaths: string[], fileAdapter: FileAdapter): Promise<void> {
	const statuses = await Promise.all(
		filePaths.map(async (filePath) => validateFilePath(filePath, fileAdapter)),
	)

	let invalidFilesFound = false
	const validFiles: string[] = []

	for (const [index, filePath] of filePaths.entries()) {
		const status = statuses[index]
		if (status === 'valid') {
			if (validFiles.includes(filePath.toLowerCase())) {
				log.error(`Duplicate file: "${filePath}"`)
				invalidFilesFound = true
			} else {
				validFiles.push(filePath.toLowerCase())
			}
		} else {
			log.error(`${validationStatusMessage(status)}: "${filePath}"`)
			invalidFilesFound = true
		}
	}

	if (invalidFilesFound) {
		throw new Error('Invalid file paths found, no files renamed.')
	}
}

/**
 * Rename files based on the provided options.
 */
// eslint-disable-next-line complexity
export async function renameFiles(options: {
	fileAdapter?: FileAdapter
	/** Expects unique, normalized, absolute paths! */
	filePaths: string[]
	options?: Partial<Options>
	transforms?: Transform | Transform[]
}): Promise<FileRenameReport> {
	const startTime = performance.now()

	const {
		fileAdapter = await getDefaultFileAdapter(),
		filePaths,
		options: transformOptions,
		transforms = [],
	} = options

	const {
		caseType,
		defaultName,
		dryRun,
		maxLength,
		truncateOnWordBoundary,
		truncationString,
		validateInput,
		validateOutput,
	} = deepmerge(defaultOptions, transformOptions ?? {})

	// Validate, throws if any file is invalid
	if (validateInput) {
		await validateFiles(filePaths, fileAdapter)
	}

	// Build the rename plan
	let fileRenamePlan: FileRenameTask[] = []

	// Sort the paths based on original file names
	const sortedFilePaths = orderBy(filePaths)

	for (const filePath of sortedFilePaths) {
		fileRenamePlan.push({
			filePathIntermediate: undefined,
			filePathOriginal: filePath,
			filePathRenamed: undefined,
			status: 'scheduled', // Will be tested for later once we know the final file name
		})
	}

	// Run the action function on each valid file and update its file path renamed value
	for (const task of fileRenamePlan) {
		// May contain trailing increments, like (1)!
		const pathObject = path.parse(task.filePathOriginal)
		let newName: string | undefined

		const transformsArray = Array.isArray(transforms) ? transforms : [transforms]

		// Run user-provided actions, in order, until one returns a new file name
		for (const transform of transformsArray) {
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
			fileSystemMaxLength: FILENAME_MAX_LENGTH,
			maxLength,
			truncateOnWordBoundary,
			truncationString,
		})

		task.filePathRenamed = pathObjectToString(pathObject)
	}

	// Sort the paths again based on the new file names
	fileRenamePlan = orderBy(fileRenamePlan, [(v) => v.filePathRenamed])

	// Find duplicates that need to be incremented
	const duplicateGroups: FileRenameTask[][] = []
	for (const [index, task] of fileRenamePlan.entries()) {
		const duplicateGroup = [task]

		// Look forward for duplicates, we're trusting in the sort
		for (let i = index + 1; i < fileRenamePlan.length; i++) {
			const nextTask = fileRenamePlan[i]
			if (nextTask.filePathRenamed!.toLowerCase() === task.filePathRenamed!.toLowerCase()) {
				// But only push if it's not in a previous group of duplicateGroups
				// Skip this file if it's already been identified as a duplicate earlier

				let alreadyInDuplicateGroup = false
				for (const group of duplicateGroups) {
					if (group.includes(nextTask)) {
						alreadyInDuplicateGroup = true
						break
					}
				}
				if (!alreadyInDuplicateGroup) {
					duplicateGroup.push(nextTask)
				}
			}
		}

		if (duplicateGroup.length > 1) {
			// First, identify items with increments and their target positions
			const incrementedItems = []

			for (let i = 0; i < duplicateGroup.length; i++) {
				const task = duplicateGroup[i]
				const originalIncrement = getIncrement(path.parse(task.filePathOriginal).name)

				if (originalIncrement !== undefined && originalIncrement - 1 < duplicateGroup.length) {
					incrementedItems.push({
						originalIndex: i,
						targetIndex: originalIncrement - 1,
						task,
					})
				}
			}

			// Create a new array to hold the reordered items
			const reorderedGroup: Array<FileRenameTask | undefined> = Array.from({
				length: duplicateGroup.length,
			})

			// First place all the incremented items at their target positions
			for (const item of incrementedItems) {
				reorderedGroup[item.targetIndex] = item.task
			}

			// Then fill in the remaining positions with unused items
			let nextUnusedItem = 0
			for (let i = 0; i < reorderedGroup.length; i++) {
				if (reorderedGroup[i] === undefined) {
					// Find the next unused item
					while (nextUnusedItem < duplicateGroup.length) {
						const candidate = duplicateGroup[nextUnusedItem++]
						const increment = getIncrement(path.parse(candidate.filePathOriginal).name)

						// Skip items that already have increments and were placed
						if (increment === undefined || increment - 1 >= duplicateGroup.length) {
							reorderedGroup[i] = candidate
							break
						}
					}
				}
			}

			// Remove any undefined entries (should not happen, but just in case)
			const finalGroup = reorderedGroup.filter((item) => item !== undefined)

			duplicateGroups.push(finalGroup)
		}
	}

	// Increment duplicates, truncating first to make room for the increment
	for (const group of duplicateGroups) {
		const maxLengthWithIncrement = maxLength - ` (${group.length.toString().length})`.length
		for (const [index, task] of group.entries()) {
			const pathObject = path.parse(task.filePathRenamed!)

			// Truncate to make room for the increment
			pathObject.name = await truncateTransform(pathObject, {
				fileSystemMaxLength: FILENAME_MAX_LENGTH,
				maxLength: maxLengthWithIncrement,
				truncateOnWordBoundary,
				truncationString,
			})

			pathObject.name = appendIncrement(pathObject.name, index + 1)
			task.filePathRenamed = pathObjectToString(pathObject)
		}
	}

	// Check for conflicts between original and final paths, setting intermediate file name if needed
	for (const task of fileRenamePlan) {
		for (const otherTask of fileRenamePlan) {
			if (task === otherTask) {
				continue
			}

			if (task.filePathRenamed!.toLowerCase() === otherTask.filePathOriginal.toLowerCase()) {
				const tempPathObject = path.parse(task.filePathRenamed!)
				tempPathObject.name = nanoid()
				task.filePathIntermediate = pathObjectToString(tempPathObject)
				break
			}
		}
	}

	// Sort the paths based on final filenames
	// fileRenamePlan.sort((a, b) =>
	// 	sort(path.parse(a.filePathRenamed!), path.parse(b.filePathRenamed!), fileAdapter),
	// )
	// TODO user-provided sort?
	fileRenamePlan = orderBy(fileRenamePlan, [(v) => v.filePathRenamed])

	// Checking for conflicts with existing files!
	if (validateOutput) {
		for (const task of fileRenamePlan) {
			if (task.filePathIntermediate !== undefined) {
				// The existing file is going to be overwritten, not a file outside the provided set
				continue
			}

			// Transform case for accurate comparison, since the fileAdapter functions are not case sensitive!
			const originalPathObject = path.parse(task.filePathOriginal)
			originalPathObject.name = convertCase(originalPathObject.name, caseType)

			if (
				pathObjectToString(originalPathObject) !== task.filePathRenamed &&
				(await exists(task.filePathRenamed!, fileAdapter))
			) {
				task.status = 'conflict'
			}
		}
	}

	// First do a pass for the intermediate files
	for (const task of fileRenamePlan) {
		const { filePathIntermediate, filePathOriginal, status } = task
		if (status === 'scheduled' && filePathIntermediate !== undefined) {
			try {
				if (!dryRun) {
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
				if (!dryRun) {
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
