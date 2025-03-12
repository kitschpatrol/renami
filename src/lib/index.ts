export { default as log } from './utilities/log'

// Thinking about config
const config = [
	{
		pattern: 'src/**/*.md',
		style: 'kebab-case',
		template: `${name}`,
	},
]

// CLI example
// renami --config config.json
// renami *.md --style kebab-case --template ${name}
