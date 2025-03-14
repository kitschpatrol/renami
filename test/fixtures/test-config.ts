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
			pattern: './test/assets/test-basic/**/*',
			transform: async () => 'test',
		},
		{
			options: {
				caseType: 'kebab',
			},
			pattern: './test/assets/test-frontmatter/**/*',
			transform: transformHelper.frontmatterTemplate('Note-{title}'),
		},
		{
			options: {
				caseType: 'kebab',
				maxLength: 15,
				truncateOnWordBoundary: false,
			},
			pattern: './test/assets/test-increment/**/*',
			transform: async () => 'wow what a long name this is',
		},
	],
})
