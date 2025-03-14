import { deepmerge } from 'deepmerge-ts'
import { type Action } from './actions'
import { defaultOptions, type Options } from './rename'
import { type Transform } from './transform'

type RenamiConfig = {
	/** Default options for all tasks, may be overridden per-task */
	options: Options
	/** List of tasks to perform */
	rules?: Rule[]
}

type Rule = {
	action?: (Action | Transform) | Array<Action | Transform>
	options?: Options
	pattern: string
}

export const defaultRenamiConfig: RenamiConfig = {
	options: defaultOptions,
}

/**
 * Factory function to create a Renami configuration object.
 * @param config - Partial Config object with custom configuration
 * @returns RenamiConfig object merged with defaults
 */
export function renamiConfig(config: Partial<RenamiConfig>): RenamiConfig {
	return deepmerge(defaultRenamiConfig, config)
}
