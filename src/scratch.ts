// Function evaluateTemplate(templateString, variables) {
// 	// Create parameter names from the variables object keys
// 	const keys = Object.keys(variables)

// 	// Create a function that returns the evaluated template literal
// 	// The function's parameters will be the variable names
// 	const templateFunction = new Function(...keys, `return \`${templateString}\`;`)

// 	// Execute the function with the variable values
// 	return templateFunction(...keys.map((key) => variables[key]))
// }

// // Example usage
// const template = 'Hello, ${name}! Today is ${day}.'
// const data = {
// 	day: 'Monday',
// 	name: 'John',
// }

// const result = evaluateTemplate(template, data)
// console.log(result) // Outputs: Hello, John! Today is Monday.

// // VM approach
// // https://gist.github.com/lxghtless/262c2c1193e2a9055bc7ca4ae9ab5914

import pupa from 'pupa'

console.log(
	pupa(
		'The mobile number of {name} is {phone.more.a} and {stuff.1} plus {something}',
		{
			name: 'Sindre',
			phone: {
				mobile: '609 24 363',
				more: {
					a: 1,
					b: 2,
				},
			},
			stuff: [1, 2, 3],
		},
		{
			ignoreMissing: true,
			transform({ value }) {
				if (value === undefined) {
					return ''
				}
				console.log(typeof value)
				return value
			},
		},
	),
)

// Can be closer to native JS template syntax, but is that more deceptive than helpful?
// import { subslate } from 'subslate'

// console.log('----------------------------------')

// console.log(
// 	subslate(
// 		// eslint-disable-next-line no-template-curly-in-string
// 		'The mobile number of ${name} is ${phone.more.a} and ${stuff[1]} plus ${something}',
// 		{
// 			name: 'Sindre',
// 			phone: {
// 				mobile: '609 24 363',
// 				more: {
// 					a: 1,
// 					b: 2,
// 				},
// 			},
// 			stuff: [1, 2, 3],
// 		},
// 		{
// 			allowRootBracket: true,
// 			allowUnquotedProps: true,
// 			sanitizer({ isEmpty, value }) {
// 				return isEmpty ? '' : String(value)
// 			},
// 		},
// 	),
// )
