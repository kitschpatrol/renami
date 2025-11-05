import { cosmiconfig } from 'cosmiconfig'
import { TypeScriptLoader as typeScriptLoader } from 'cosmiconfig-typescript-loader'
import { deepmerge } from 'deepmerge-ts'
import path from 'pathe'
import { z } from 'zod'
import type { Transform } from './transform'
import type { CaseType } from './utilities/string'
import type { TimeZone } from './utilities/time-zone'
import { TransformSchema } from './transform'
import log from './utilities/log'
import { FILENAME_MAX_LENGTH } from './utilities/platform'
import { CASE_TYPE_NAMES } from './utilities/string'
import { TIME_ZONES } from './utilities/time-zone'

/**
 * These globally and may also be overridden per-rule.
 */
export type Options = {
	/** Enforce a specific letter casing on the final filenames. */
	caseType: CaseType
	/** Replace duplicate whitespace with a single space  */
	collapseDuplicateWhitespace: boolean
	/** If a template is missing values and has sections like `bla - - bla - `, this will collapse extra delimiter strings to yield `bla - bla` */
	collapseSurplusDelimiters: boolean
	/** In rare cases a path that's all unsafe characters, or that has no will become zero-length... and in strict mode, if no transformations work, then this default is used in such cases. */
	defaultName: string
	/** Delimiter to use to join array values in templates, and used to collapse surplus delimiters in templates */
	delimiter: string
	/** Don't actually rename any files */
	dryRun: boolean
	/** Ignore notes matching the containing folder name, as may be the case when using the [obsidian-folder-notes](https://github.com/LostPaul/obsidian-folder-notes) plugin. */
	ignoreFolderNotes: boolean
	/** Locale to use for date/time transformations. Takes a BCP-47 language tag like `"en-US"` */
	locale: string
	/** Maximum number of characters in the file, including file extension but excluding base path. Any automatic truncation strings or increments will count towards this maximum. */
	maxLength: number
	/** If no user-provided transformations work (they all return undefined), then use the default name. Otherwise, the original name is preserved. Technically breaks idempotence. */
	strict: boolean
	/** Timezone to use for date/time transformations. Takes an  [IANA tz value](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) like `"America/New_York"` */
	timeZone: TimeZone
	/** Trim leading and trailing white space */
	trim: boolean
	/** Try to truncate the file on a word boundary, might result in files shorter than the maxLength target. */
	truncateOnWordBoundary: boolean
	/** String like '...' to use when truncation is needed */
	truncationString: string
	/** Run some checks to make sure the input file list is sane */
	validateInput: boolean
	/** Make sure we're not overwriting a file that wasn't included in the files argument */
	validateOutput: boolean
}

export type Rule = {
	/** Override the top-level options with rule-specific settings */
	options?: Partial<Options>
	/** Glob pattern(s) of files to match relative to the config file location */
	pattern: string | string[]
	/** Transform(s) for the filenames, or plain strings(s) to use the Universal Template */
	transform?: string | string[] | Transform | Transform[]
}

export type RenamiConfig = {
	/** Default options for all tasks, may be overridden per-task */
	options?: Partial<Options>
	/** List of tasks to perform */
	rules?: Rule[]
}

/**
 * Zod schema for validating the Options type
 */
const OptionsSchema = z
	.object({
		caseType: z.enum(CASE_TYPE_NAMES),
		collapseDuplicateWhitespace: z.boolean(),
		collapseSurplusDelimiters: z.boolean(),
		defaultName: z.string().min(1),
		delimiter: z.string(),
		dryRun: z.boolean(),
		ignoreFolderNotes: z.boolean(),
		locale: z.string().refine(isValidLocale, {
			message: 'Invalid BCP-47 locale tag',
		}),
		maxLength: z.number().int().positive().lte(1000),
		strict: z.boolean(),
		timeZone: z.enum(TIME_ZONES),
		trim: z.boolean(),
		truncateOnWordBoundary: z.boolean(),
		truncationString: z.string(),
		validateInput: z.boolean(),
		validateOutput: z.boolean(),
	})
	.strict() satisfies z.ZodType<Options>

/**
 * Zod schema for validating the Rule type
 */
const RuleSchema = z
	.object({
		options: z.optional(OptionsSchema.partial()),
		pattern: z.union([z.string(), z.array(z.string())]),
		transform: z.optional(
			z.union([z.string(), z.array(z.string()), TransformSchema, z.array(TransformSchema)]),
		),
	})
	.strict() satisfies z.ZodType<Rule>

/**
 * Zod schema for validating the RenamiConfig type
 */
const RenamiConfigSchema = z
	.object({
		/** Default options for all tasks, may be overridden per-task */
		options: z.optional(OptionsSchema.partial()),
		/** List of tasks to perform */
		rules: z.optional(z.array(RuleSchema)),
	})
	.strict() satisfies z.ZodType<RenamiConfig>

export const defaultOptions: Options = {
	caseType: 'preserve',
	collapseDuplicateWhitespace: true,
	collapseSurplusDelimiters: true,
	defaultName: 'Untitled',
	delimiter: ' - ',
	dryRun: false,
	ignoreFolderNotes: false,
	locale: Intl.DateTimeFormat().resolvedOptions().locale,
	maxLength: FILENAME_MAX_LENGTH,
	strict: false,
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone as TimeZone,
	trim: true,
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
export function defineRenamiConfig(config: Partial<RenamiConfig>): RenamiConfig {
	return deepmerge(defaultRenamiConfig, config)
}

/**
 * Load and validate a Renami configuration from an object, useful in Obsidian plugin
 */
export function loadConfigObject(config: Partial<RenamiConfig>): RenamiConfig | undefined {
	if (typeof config === 'object') {
		try {
			// Set defaults, validate and parse the config
			const validatedConfig = parseConfig(
				// eslint-disable-next-line ts/no-unsafe-type-assertion
				defineRenamiConfig(config as unknown as Partial<RenamiConfig>),
			)
			return validatedConfig
		} catch (error) {
			if (error instanceof Error) {
				// Log the error but continue with the config search
				log.error(`Invalid config object: ${error.message}`)
			}
		}
	}
	return undefined
}

/**
 * Load and validate a Renami configuration one way or another
 */
export async function loadConfig(
	config?: Partial<RenamiConfig> | string,
	searchFrom?: string,
): Promise<
	| undefined
	| {
			config: RenamiConfig
			configCwd: string
	  }
> {
	// Load config from passed object
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	const maybeConfig = loadConfigObject(config as unknown as Partial<RenamiConfig>)
	if (maybeConfig !== undefined) {
		return {
			config: maybeConfig,
			configCwd: process.cwd(),
		}
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
			try {
				// Validate and parse the config
				const validatedConfig = parseConfig(
					// eslint-disable-next-line ts/no-unsafe-type-assertion
					defineRenamiConfig(loadedConfig.config as unknown as Partial<RenamiConfig>),
				)

				log.info(`Loaded config from provided file path: ${loadedConfig.filepath}`)
				return {
					config: validatedConfig,
					configCwd: path.dirname(loadedConfig.filepath),
				}
			} catch (error) {
				if (error instanceof Error) {
					log.error(`Invalid config in file ${loadedConfig.filepath}: ${error.message}`)
				}
			}
		}
	}

	// Search for config
	const loadedConfig = await configExplorer.search(searchFrom)
	if (loadedConfig !== null && !loadedConfig.isEmpty) {
		try {
			// Validate and parse the config
			const validatedConfig = parseConfig(
				// eslint-disable-next-line ts/no-unsafe-type-assertion
				defineRenamiConfig(loadedConfig.config as unknown as Partial<RenamiConfig>),
			)

			log.info(`Found config at location: ${loadedConfig.filepath}`)
			return {
				config: validatedConfig,
				configCwd: path.dirname(loadedConfig.filepath),
			}
		} catch (error) {
			if (error instanceof Error) {
				log.error(`Invalid config in file ${loadedConfig.filepath}: ${error.message}`)
			}
		}
	}

	// Give up
	return undefined

	// Failing everything, use bare defaults
	// log.warn('No config found, using defaults')
	// return defaultRenamiConfig
}

/**
 * Parses and validates a configuration object against the RenamiConfig schema
 * @param config - The configuration object to validate
 * @returns The validated RenamiConfig object
 * @throws {Error} if the configuration is invalid
 */
function parseConfig(config: unknown): RenamiConfig {
	try {
		return RenamiConfigSchema.parse(config)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const formattedErrors = error.errors
				.map((error_) => `${error_.path.join('.')}: ${error_.message}`)
				.join('\n')

			throw new Error(`Invalid RenamiConfig: \n${formattedErrors}`)
		}
		throw error
	}
}

/**
 * Returns true if `tz` is a known IANA time‑zone.
 */
export function isValidTimeZone(tz: string): boolean {
	// Modern engines (Node v21+, recent browsers) support this:
	if (typeof Intl.supportedValuesOf === 'function') {
		return Intl.supportedValuesOf('timeZone').includes(tz)
	}

	// Fallback: constructing a formatter will throw if tz is unrecognized
	try {
		// `undefined` locale → use runtime default
		// eslint-disable-next-line no-new
		new Intl.DateTimeFormat(undefined, { timeZone: tz })
		return true
	} catch {
		return false
	}
}

/**
 * Returns true if `tag` is a valid BCP 47 locale.
 */
export function isValidLocale(tag: string): boolean {
	try {
		// Will throw a RangeError if `tag` isn’t a valid BCP 47 identifier
		// eslint-disable-next-line no-new
		new Intl.Locale(tag)
		return true
	} catch {
		return false
	}
}
