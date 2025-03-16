import { toString } from 'mdast-util-to-string'
import propertyExpr from 'property-expr'
import { type Node, select } from 'unist-util-select'
import { formatValue } from '../format'
import { interpolate, type InterpolationContext } from './core'

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
): string {
	return interpolate(template, (context: InterpolationContext) => {
		const { braceCount, pipeValues, value } = context

		// Handle different brace counts
		if (braceCount === 1) {
			// Single braces: object accessor using object-path
			const getter = propertyExpr.getter(value, true)
			const resolvedValue = getter(metadata) as unknown
			return formatValue(resolvedValue, pipeValues)
		}

		if (braceCount === 2) {
			// Double braces: AST selector using mdast-util-to-string
			try {
				const selected = select(value, tree)
				const extractedValue = selected === undefined ? '' : toString(selected)
				return formatValue(extractedValue, pipeValues)
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
}
