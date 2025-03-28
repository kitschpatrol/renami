import type { Options } from '../config'
import type { Transform } from '../transform'
import log from '../utilities/log'
import { markdownTemplate } from './markdown'

/**
 * Delegates to the appropriate template handler based on the file type
 * @returns renami transform function
 */
export function universalTemplate(template: string, options: Options): Transform {
	return async (context) => {
		switch (context.filePath.ext.toLowerCase()) {
			case '.md': {
				return markdownTemplate(template, options)(context)
			}

			// TODO more file type template handlers!

			default: {
				// eslint-disable-next-line ts/require-await
				return (async (context) => {
					log.warn(`No universal template handler for this file type yet: ${context.filePath.ext}`)
					// eslint-disable-next-line unicorn/no-useless-undefined
					return undefined
				})(context)
			}
		}
	}
}
