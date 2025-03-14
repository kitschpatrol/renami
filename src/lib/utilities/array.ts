/**
 * Wraps single instances in an array, converts undefined into an empty array.
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) {
		return []
	}

	return Array.isArray(value) ? value : [value]
}
