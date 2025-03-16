import { fileCallback } from './file'
import { markdownCallback } from './markdown'
import { universalTemplate } from './universal'

export const transformHelper = {
	fileCallback,
	markdownCallback,
	universalTemplate,
}

export type TransformHelper =
	| typeof fileCallback
	| typeof markdownCallback
	| typeof universalTemplate

// TODO explore typed tuples for better config autocomplete...
// A generic type that produces a tuple of [Name, ArgumentType]

// export type TupleFromFn<F extends (args: any) => any, Name extends string> = [
// 	Name,
// 	Parameters<F>[0],
// ]

// type FileCallbackTuple = TupleFromFn<typeof fileCallback, 'fileCallback'>

// const a: FileCallbackTuple = ['fileCallback', () => 'yes']
