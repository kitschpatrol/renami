import { fileCallback } from './file'
import { frontmatterTemplate, markdownCallback, markdownTemplate } from './markdown'

export default {
	fileCallback,
	frontmatterTemplate,
	markdownCallback,
	markdownTemplate,
}

export type Action =
	| typeof fileCallback
	| typeof frontmatterTemplate
	| typeof markdownCallback
	| typeof markdownTemplate

// TODO explore typed tuples for better config autocomplete...
// A generic type that produces a tuple of [Name, ArgumentType]

// export type TupleFromFn<F extends (args: any) => any, Name extends string> = [
// 	Name,
// 	Parameters<F>[0],
// ]

// type FileCallbackTuple = TupleFromFn<typeof fileCallback, 'fileCallback'>

// const a: FileCallbackTuple = ['fileCallback', () => 'yes']
