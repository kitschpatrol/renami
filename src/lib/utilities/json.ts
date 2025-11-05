/* eslint-disable ts/no-restricted-types */
/* eslint-disable complexity */

/**
 * Options for the stringifyCompact function.
 */
type StringifyCompactOptions = {
	/** Character(s) to join values with. Defaults to ',' */
	delimiter?: string
	/** Whether to include object keys in output. Defaults to false */
	includeKeys?: boolean
	/** Whether to include null values. Defaults to false */
	includeNull?: boolean
	/** Whether to include undefined values. Defaults to false */
	includeUndefined?: boolean
	/** Separator between keys and values when includeKeys is true. Defaults to ':' */
	keyValueSeparator?: string
	/** Maximum depth for recursion. Defaults to 100 */
	maxDepth?: number
	/**
	 * Optional callback to transform values. Works bottom-up, taking keyOrIndex and value,
	 * returning transformed value.
	 */
	replacer?: (keyOrIndex: number | string | undefined, value: unknown) => unknown
}

/**
 * Compactly stringifies any JavaScript value into a single-line representation.
 *
 * This function recursively traverses a data structure and converts it
 * to a single string with values separated by the specified delimiter.
 * Unlike JSON.stringify, this function attempts to serialize any JavaScript
 * value, including Maps, Sets, functions, Symbols, etc.
 *
 * Note: This is a one-way conversion intended for display or logging purposes.
 * The resulting string is not designed to be parsed back into the original
 * structure, as type information and structural relationships may be lost
 * during serialization.
 * @param value - The value to stringify
 * @param options - Configuration options
 * @returns A compact string representation of the input
 * @example
 * // Returns: "yes,no,1,2,3"
 * stringifyCompact({ a: 'yes', b: 'no', d: [1, 2, 3] });
 * @example
 * // Returns: "a:YES - b:NO - d:1 - 2 - 3"
 * stringifyCompact({ a: 'yes', b: 'no', d: [1, 2, 3] }, {
 *   delimiter: ' - ',
 *   includeKeys: true,
 *   replacer: (keyOrIndex, value) => typeof value === 'string' ? value.toUpperCase() : value
 * });
 * @example
 * // Returns: "1,2,3,a,b,c"
 * stringifyCompact(new Map([[1, 'a'], [2, 'b'], [3, 'c']]));
 */
export function stringifyCompact(value: unknown, options: StringifyCompactOptions = {}): string {
	const result = stringifyCompactInternal(value, options, [], new WeakSet(), 0)
	// Handle the special marker for the top-level call
	return result === '__SKIP_THIS_VALUE__' ? (options.includeUndefined ? 'undefined' : '') : result
}

/**
 * Internal implementation of stringifyCompact with additional parameters for recursion.
 * @param value - The value to stringify
 * @param options - Configuration options
 * @param path - Current path in the object structure (for error reporting)
 * @param seen - WeakSet of already processed objects (for cycle detection)
 * @param depth - Current recursion depth
 * @returns A compact string representation of the input
 */
function stringifyCompactInternal(
	value: unknown,
	options: StringifyCompactOptions,
	path: string[],
	seen: WeakSet<object>,
	depth: number,
): string {
	const {
		delimiter = ',',
		includeKeys = false,
		includeNull = false,
		includeUndefined = false,
		keyValueSeparator = ':',
		maxDepth = 100,
		replacer,
	} = options

	// Check recursion depth
	if (depth > maxDepth) {
		console.warn(`Maximum recursion depth exceeded at path: ${path.join('.')}`)
		return '[Max Depth Exceeded]'
	}

	// Extract current key/index (undefined for root value)
	const currentPathItem = path.length > 0 ? path.at(-1) : undefined

	// Determine key or index based on path
	const keyOrIndex =
		currentPathItem === undefined
			? undefined
			: Number.isNaN(Number(currentPathItem))
				? currentPathItem
				: Number(currentPathItem)

	// Apply replacer first if provided
	if (replacer) {
		try {
			value = replacer(keyOrIndex, value)
		} catch (error) {
			console.warn(`Error in replacer function at path ${path.join('.')}: ${String(error)}`)
		}
	}

	// Handle cycle detection for objects
	if (value !== null && typeof value === 'object') {
		if (seen.has(value)) {
			return '[Circular Reference]'
		}

		// Add to seen objects
		seen.add(value)
	}

	try {
		// Handle null and undefined - check early and return special marker for skipping
		if (value === null) {
			return includeNull ? 'null' : '__SKIP_THIS_VALUE__'
		}

		if (value === undefined) {
			return includeUndefined ? 'undefined' : '__SKIP_THIS_VALUE__'
		}

		// Handle primitive types and special cases
		if (typeof value === 'string') {
			return value
		}
		if (typeof value === 'number') {
			return String(value)
		}
		if (typeof value === 'boolean') {
			return value ? 'true' : 'false'
		}
		if (typeof value === 'symbol') {
			return value.toString()
		}
		if (typeof value === 'bigint') {
			return value.toString()
		}
		if (typeof value === 'function') {
			return value.name.length === 0
				? includeUndefined
					? 'undefined'
					: '__SKIP_THIS_VALUE__'
				: value.name
		}

		// Handle Date objects
		if (value instanceof Date) {
			return value.toISOString()
		}

		// Handle RegExp objects
		if (value instanceof RegExp) {
			return value.toString()
		}

		// Handle Error objects
		if (value instanceof Error) {
			return value.message
		}

		// Handle Map objects
		if (value instanceof Map) {
			const entries = [...value.entries()]
				.map(([k, v]) => {
					const keyString = typeof k === 'object' && k !== null ? '[Object]' : String(k)

					const flatValue = stringifyCompactInternal(
						v,
						options,
						[...path, keyString],
						seen,
						depth + 1,
					)

					// Skip this entry if the value should be skipped
					if (flatValue === '__SKIP_THIS_VALUE__') return ''

					return includeKeys ? `${keyString}${keyValueSeparator}${flatValue}` : flatValue
				})
				.filter((v) => v !== '')

			return entries.join(delimiter)
		}

		// Handle Set objects
		if (value instanceof Set) {
			const values = [...value.values()]
				.map((v, i) =>
					stringifyCompactInternal(v, options, [...path, i.toString()], seen, depth + 1),
				)
				.filter((v) => v !== '__SKIP_THIS_VALUE__')

			return values.join(delimiter)
		}

		// Handle arrays
		if (Array.isArray(value)) {
			const items = value
				.map((v, i) =>
					stringifyCompactInternal(v, options, [...path, i.toString()], seen, depth + 1),
				)
				.filter((v) => v !== '__SKIP_THIS_VALUE__')

			return items.join(delimiter)
		}

		// Handle any other objects
		// eslint-disable-next-line ts/no-unsafe-type-assertion
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([k, v]) => {
				const flatValue = stringifyCompactInternal(v, options, [...path, k], seen, depth + 1)

				// Skip this entry if the value should be skipped
				if (flatValue === '__SKIP_THIS_VALUE__') return ''

				return includeKeys ? `${k}${keyValueSeparator}${flatValue}` : flatValue
			})
			.filter((v) => v !== '')

		return entries.join(delimiter)
	} catch (error) {
		// If serialization fails at any point, log warning and treat as undefined
		console.warn(`Failed to serialize value at path ${path.join('.')}: ${String(error)}`)
		return includeUndefined ? 'undefined' : '__SKIP_THIS_VALUE__'
	}
}
