import { deepmerge } from 'deepmerge-ts'
import { globby } from 'globby'
import { loadConfig, type RenamiConfig } from './config'
import { type FileRenameReport, renameFiles } from './rename-files'
import { type FileAdapter, getDefaultFileAdapter } from './utilities/file'
import log from './utilities/log'

export type RenameReport = {
	duration: number
	rules: Array<{
		pattern: string
		report: FileRenameReport
	}>
}

/**
 * Rename files according to the provided configuration.
 * If a string is provided, it will be used as the config file path.
 * @returns A report of the renaming process
 */
export async function rename(options: {
	/** Can be a path to config file, a config object, or undefined to attempt config discovery in accordance with Cosmiconfig's resolution strategy. */
	config?: Partial<RenamiConfig> | string
	/** Path to search for config file from. Defaults to the current working directory. */
	configSearchFrom?: string
	/** File adapter to use for file operations in non-Node environments. */
	fileAdapter?: FileAdapter
}): Promise<RenameReport> {
	const startTime = performance.now()
	const { config, configSearchFrom, fileAdapter = await getDefaultFileAdapter() } = options

	const loadedConfig = await loadConfig(config, configSearchFrom)

	if (loadedConfig === undefined) {
		log.warn('No config found, nothing to do.')
		return {
			duration: performance.now() - startTime,
			rules: [],
		}
	}

	const { options: defaultTransformOptions, rules } = loadedConfig

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

	for (const { options: transformOptions, pattern, transforms } of rules) {
		// TODO hmm gitignore breaks testing with "path is now in CWD"
		// Since 2019... https://github.com/sindresorhus/globby/issues/133
		const filePaths = await globby(pattern, { absolute: true, gitignore: false, onlyFiles: true })
		const options = deepmerge(defaultTransformOptions, transformOptions ?? {})

		const report = await renameFiles({
			fileAdapter,
			filePaths,
			options,
			transforms,
		})

		renameReport.rules.push({
			pattern,
			report,
		})
	}

	renameReport.duration = performance.now() - startTime
	return renameReport
}
