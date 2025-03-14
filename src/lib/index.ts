export {
	defaultRenameOptions,
	type FileRenameReport,
	renameFiles,
	type RenameOptions,
} from './rename'
export { default as log } from './utilities/log'

// Thinking about config
// const config = {
// 	defaultOptions: {
// 		case: 'kebab',
// 	}
// 	[
// 	{
// 		pattern: 'src/**/*.md',
// 		actions: [
// 			async (filePath) => {
// 			// return new file path
// 		}
// 		maxLength: 100,
// 		truncationString: '...',
// 		breakOnWord: true,

// 	},
// ]

// CLI example
// renami --config config.json
// renami *.md --style kebab-case --template ${name}
