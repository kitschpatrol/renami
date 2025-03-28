import { ENVIRONMENT } from './platform'

type GlobAdapterOptions = {
	/** Whether to return absolute paths or not, default false */
	absolute?: boolean
	/** The current working directory to resolve the patterns against, default detected cwd */
	cwd?: string
	/** Whether to match only files (not directories), default false */
	onlyFiles?: boolean
}

export type GlobAdapter = {
	globMatch(patterns: readonly string[] | string, options?: GlobAdapterOptions): Promise<string[]>
}

/**
 * Zod schema for GlobAdapterOptions, useful for the function definition
 * Currently unused since it's not part of the config file specification.
 */
// export const GlobAdapterOptionsSchema = z.object({
// 	absolute: z.boolean().optional(),
// 	cwd: z.string().optional(),
// 	onlyFiles: z.boolean().optional(),
// }) satisfies z.ZodType<GlobAdapterOptions>

/**
 * Zod schema for FileAdapter, satisfies instead of infers for cleaner type intellisense.
 * Currently unused since it's not part of the config file specification.
 */
// export const GlobAdapterSchema = z.object({
// 	globMatch: z.function(
// 		// Define arguments using z.tuple
// 		z.tuple([
// 			// Arg 1: patterns (readonly string[] | string)
// 			z.union([z.array(z.string()), z.string()]),
// 			// Arg 2: options? (GlobAdapterOptions) - optional object
// 			GlobAdapterOptionsSchema.optional(),
// 		]),
// 		// Define return type: Promise<string[]>
// 		z.promise(z.array(z.string())),
// 	),
// }) satisfies z.ZodType<GlobAdapter>

/**
 * Get the default file glob adapter for the current environment. Non-node
 * environments will have to provide their own implementations.
 *
 * This is done mostly for ease of implementation with Obsidian's plugin API.
 */
export async function getDefaultGlobAdapter(): Promise<GlobAdapter> {
	if (ENVIRONMENT === 'node') {
		// TODO memoize
		const { globby } = await import('globby')
		// eslint-disable-next-line ts/no-unnecessary-condition
		if (globby === undefined) {
			throw new Error('Error loading Globby dependency in Node environment')
		}

		return {
			async globMatch(
				patterns: readonly string[] | string,
				options?: GlobAdapterOptions, // Match the type here
			): Promise<string[]> {
				// TODO Tried to follow gitignore, but it breaks testing with "path is not in CWD"
				// an issue since 2019... https://github.com/sindresorhus/globby/issues/133
				return globby(patterns, options)
			},
		}
	}

	throw new Error(
		'The "globMatch" function implementation must be provided to the function when running in the browser',
	)
}
