/* eslint-disable ts/require-await */
import { renamiConfig, transformHelper } from '../../src/lib'

export default renamiConfig({
	options: {
		dryRun: true,
		validateInput: false,
		validateOutput: false,
	},
	rules: [
		{
			pattern: '../assets/test-basic/**/*',
			transform: transformHelper.fileCallback(({ fileInfo }) => `${fileInfo.size}-test`),
		},
		{
			options: {
				caseType: 'kebab',
			},
			pattern: '../assets/test-frontmatter/**/*',
			transform: 'Note-{title}',
		},
		{
			options: {
				caseType: 'kebab',
				maxLength: 15,
				truncateOnWordBoundary: false,
			},
			pattern: '../assets/test-increment/**/*',
			transform: async () => 'wow what a long name this is',
		},
	],
})
