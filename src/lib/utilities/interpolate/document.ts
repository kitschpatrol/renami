import type { Node } from 'unist-util-select'
import { isArray, isObject, isString } from '@sindresorhus/is'
import { toString } from 'mdast-util-to-string'
import propertyExpr from 'property-expr'
import { select } from 'unist-util-select'
import type { Options } from '../../config'
import type { InterpolationContext } from './core'
import { defaultOptions } from '../../config'
import { formatValue } from '../format'
import { stringifyCompact } from '../json'
import { extractLinkLabel } from '../markdown'
import { interpolate } from './core'

/**
 * Interpolates a template string with metadata and AST tree
 * @param template - The template string to process
 * @param metadata - Object containing metadata for single-brace interpolation
 * @param tree - Unified AST for double-brace query interpolation
 * @returns - The processed string with interpolations replaced
 */
export function interpolateDocument(
	template: string,
	metadata: Record<string, unknown>,
	tree: Node,
	options: Options = defaultOptions,
): string | undefined {
	const result = interpolate(template, (context: InterpolationContext) => {
		const { braceCount, pipeValues, value } = context

		// Handle different brace counts
		if (braceCount === 1) {
			// Single braces: object accessor using object-path
			const getter = propertyExpr.getter(value, true)
			const resolvedValue = getter(metadata) as unknown

			// Does its best to get something form the resolved value
			const cleanResolvedValue =
				isString(resolvedValue) || isArray(resolvedValue) || isObject(resolvedValue)
					? stringifyCompact(resolvedValue, {
							delimiter: options.delimiter,
							replacer(_, value) {
								if (typeof value === 'string') {
									return extractLinkLabel(value)
								}
								return value
							},
						})
					: resolvedValue

			return formatValue(cleanResolvedValue, pipeValues, options)
		}

		if (braceCount === 2) {
			// Double braces: AST selector using mdast-util-to-string
			try {
				const selected = select(value, tree)
				const extractedValue = selected === undefined ? '' : toString(selected)
				return formatValue(extractedValue, pipeValues, options)
			} catch {
				// Return empty string if selection fails
				return ''
			}
		}

		if (braceCount === 3) {
			// Triple braces: Not implemented in this version
			return ''
		}

		return ''
	})

	return result === '' ? undefined : result
}
