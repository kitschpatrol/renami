import pupa from 'pupa'
import { getFrontmatter } from '../utilities/markdown'
import { pathObjectToString } from '../utilities/path'
import { type Transform } from './core'

/**
 * Compose a filename from frontmatter using a callback function
 * @param callback Function that takes frontmatter object and returns a string
 * @returns renami transform function
 */
export function frontmatter(callback: (frontmatter: Record<string, unknown>) => string): Transform {
	return async (filePath, options) => {
		const { fileAdapter } = options
		const fullPath = pathObjectToString(filePath)
		const contents = await fileAdapter.readFile(fullPath)
		const frontmatter = getFrontmatter(contents)
		return callback(frontmatter)
	}
}

/**
 * Compose a filename from frontmatter using a template
 * @param template Template string with {placeholders} for frontmatter keys (Uses the Pupa micro-template library)
 * @returns renami transform function
 * @example `frontmatterTemplate('Note-{title}')`
 */
export function frontmatterTemplate(template: string): Transform {
	return frontmatter((frontmatter) =>
		pupa(template, frontmatter, {
			ignoreMissing: true,
			transform({ value }) {
				if (value === undefined) {
					return ''
				}
				return value
			},
		}),
	)
}
