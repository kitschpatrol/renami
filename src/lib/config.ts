import { cosmiconfig } from 'cosmiconfig'
import { TypeScriptLoader as typeScriptLoader } from 'cosmiconfig-typescript-loader'
import { deepmerge } from 'deepmerge-ts'
import { type Transform } from './transform'
import log from './utilities/log'
import { FILENAME_MAX_LENGTH } from './utilities/platform'
import { type CaseType } from './utilities/string'

export type RenamiConfig = {
	/** Default options for all tasks, may be overridden per-task */
	options: Partial<Options>
	/** List of tasks to perform */
	rules?: Rule[]
}

export type Rule = {
	options?: Partial<Options>
	pattern: string
	transforms?: Transform | Transform[]
}

export type Options = {
	/** Enforce a specific letter casing on the final file names. */
	caseType: CaseType
	/** In rare cases a path that's all unsave characters will become zero-length... this default is used in such cases. */
	defaultName: string
	/** Don't actually rename any files */
	dryRun: boolean
	/** Maximum number of characters in the file, including file extension but excluding base path. Any automatic truncation strings or increments will count towards this maximum. */
	maxLength: number
	/** Try to truncate the file on a word boundary, might result in files shorter than the maxLength target. */
	truncateOnWordBoundary: boolean
	/** String like '...' to use when truncation is needed */
	truncationString: string
	/** Run some checks to make sure the input file list is sane */
	validateInput: boolean
	/** Make sure we're not overwriting a file that wasn't included in the files argument */
	validateOutput: boolean
}

export const defaultOptions: Options = {
	caseType: 'preserve',
	defaultName: 'Untitled',
	dryRun: false,
	maxLength: FILENAME_MAX_LENGTH,
	truncateOnWordBoundary: true,
	truncationString: '...',
	validateInput: true,
	validateOutput: true,
}

export const defaultRenamiConfig: RenamiConfig = {
	options: defaultOptions,
}

/**
 * Factory function to help create a Renami configuration object with type safety.
 * @param config - Partial Config object with custom configuration
 * @returns RenamiConfig object merged with defaults
 */
export function renamiConfig(config: Partial<RenamiConfig>): RenamiConfig {
	return deepmerge(defaultRenamiConfig, config)
}

// RenamiConfig type guard
function isRenamiConfig(config: unknown): config is RenamiConfig {
	if (config === null || typeof config !== 'object') return false

	const possibleConfig = config as Record<string, unknown>

	// Check if rules is present and is an array
	if (
		'rules' in possibleConfig &&
		possibleConfig.rules !== undefined &&
		!Array.isArray(possibleConfig.rules)
	) {
		return false
	}

	// Check if options is present and is an object
	if (
		'options' in possibleConfig &&
		possibleConfig.options !== undefined &&
		(typeof possibleConfig.options !== 'object' || possibleConfig.options === null)
	) {
		return false
	}

	return true
}

/**
 * Load a Renami configuration one way or another
 */
export async function loadConfig(
	config?: Partial<RenamiConfig> | string,
	searchFrom?: string,
): Promise<RenamiConfig | undefined> {
	// Load config from passed object
	if (isRenamiConfig(config)) {
		// Set defaults and return
		return renamiConfig(config)
	}

	const configExplorer = cosmiconfig('renami', {
		loaders: {
			// Using the alternate typescript loader fixes ERR_MODULE_NOT_FOUND errors
			// in configuration files that import modules via a path
			// https://github.com/cosmiconfig/cosmiconfig/issues/345
			// https://github.com/Codex-/cosmiconfig-typescript-loader
			'.ts': typeScriptLoader(),
		},
	})

	// Load config from path
	if (typeof config === 'string') {
		// Try to load the config from the file system
		const loadedConfig = await configExplorer.load(config)

		if (loadedConfig !== null && !loadedConfig.isEmpty) {
			log.info(`Loaded config from provided file path: ${loadedConfig.filepath}`)
			return renamiConfig(loadedConfig.config as unknown as Partial<RenamiConfig>)
		}
	}

	// Search for config
	const loadedConfig = await configExplorer.search(searchFrom)
	if (loadedConfig !== null && !loadedConfig.isEmpty) {
		log.info(`Found config at location: ${loadedConfig.filepath}`)
		return renamiConfig(loadedConfig.config as unknown as Partial<RenamiConfig>)
	}

	// Give up
	return undefined

	// Failing everything, use bare defaults
	// log.warn('No config found, using defaults')
	// return defaultRenamiConfig
}
