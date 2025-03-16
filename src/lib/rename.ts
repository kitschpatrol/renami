import { deepmerge } from 'deepmerge-ts'
import { globby } from 'globby'
import { loadConfig, type RenamiConfig } from './config'
import { type FileRenameReport, renameFiles } from './rename-files'
import { ensureArray } from './utilities/array'
import { type FileAdapter, getDefaultFileAdapter } from './utilities/file'
import log from './utilities/log'

export type RenameReport = {
	duration: number
	rules: Array<{
		pattern: string[]
		report: FileRenameReport
	}>
}

/**
 * Gets all files matching the pattern(s) in the rules and ensures each file
 * is only processed ONCE by the last rule that matches it.
 * @param rules - The rules from the Renami configuration
 * @returns A 2D array where each inner array contains the files exclusively matched by a rule
 */
async function getMaskedMatchedFiles(
	rules: RenamiConfig['rules'],
	cwd: string,
): Promise<string[][]> {
	if (!rules || rules.length === 0) {
		return []
	}

	// Keep track of all matched files to avoid processing them again
	const processedFiles = new Set<string>()

	// Process rules in reverse order (last to first)
	const reversedRules = [...rules].reverse()
	const reversedResults: string[][] = []

	for (const rule of reversedRules) {
		// Match files for the current rule
		const matchedFiles = await globby(rule.pattern, {
			// Causes test errors...
			// gitignore: true,
			absolute: true,
			cwd,
			onlyFiles: true,
		})

		// Filter out files that have already been matched by later rules
		const exclusivelyMatchedFiles = matchedFiles.filter((file) => !processedFiles.has(file))

		// Add these files to the processed set so they won't be processed by earlier rules
		for (const file of exclusivelyMatchedFiles) {
			processedFiles.add(file)
		}

		// Add the exclusively matched files to the result
		reversedResults.push(exclusivelyMatchedFiles)
	}

	// Reverse the results back to original rule order
	return reversedResults.reverse()
}

/**
 * Rename files according to the provided configuration.
 * If a string is provided, it will be used as the config file path.
 * @returns A report of the renaming process
 */
export async function rename(options?: {
	/** Can be a path to config file, a config object, or undefined to attempt config discovery in accordance with Cosmiconfig's resolution strategy. */
	config?: Partial<RenamiConfig> | string
	/** Path to search for config file from. Defaults to the current working directory. */
	configSearchFrom?: string
	/** File adapter to use for file operations in non-Node environments. */
	fileAdapter?: FileAdapter
}): Promise<RenameReport> {
	const startTime = performance.now()
	const { config, configSearchFrom, fileAdapter = await getDefaultFileAdapter() } = options ?? {}

	const loadedConfig = await loadConfig(config, configSearchFrom)

	if (loadedConfig === undefined) {
		log.warn('No config found, nothing to do.')
		return {
			duration: performance.now() - startTime,
			rules: [],
		}
	}

	const {
		config: { options: defaultTransformOptions, rules },
		configCwd,
	} = loadedConfig

	if (rules === undefined || rules.length === 0) {
		log.warn('No rules found, nothing to do.')
		return {
			duration: performance.now() - startTime,
			rules: [],
		}
	}

	const renameReport: RenameReport = {
		duration: 0,
		rules: [],
	}

	// Get masked matched files for all rules (files exclusive to each rule)

	const maskedMatches = await getMaskedMatchedFiles(rules, configCwd)

	for (const [index, { options: transformOptions, pattern, transform }] of rules.entries()) {
		// TODO hmm gitignore breaks testing with "path is not in CWD"
		// Since 2019... https://github.com/sindresorhus/globby/issues/133
		const filePaths = maskedMatches[index]
		const options = deepmerge(defaultTransformOptions, transformOptions ?? {})

		const report = await renameFiles({
			fileAdapter,
			filePaths,
			options,
			transform,
		})

		renameReport.rules.push({
			pattern: ensureArray(pattern),
			report,
		})
	}

	renameReport.duration = performance.now() - startTime
	return renameReport
}
