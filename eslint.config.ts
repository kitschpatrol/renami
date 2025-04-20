import { eslintConfig } from '@kitschpatrol/eslint-config'

export default eslintConfig(
	{
		ts: {
			overrides: {
				'depend/ban-dependencies': [
					'error',
					{
						allowed: ['globby'],
					},
				],
				'new-cap': [
					'error',
					{
						capIsNewExceptionPattern: String.raw`^Intl\..`,
					},
				],
				'ts/naming-convention': [
					'error',
					{
						format: ['UPPER_CASE'],
						modifiers: ['const', 'exported'],
						selector: 'variable',
						// Not objects...
						types: ['boolean', 'string', 'number', 'array'],
					},
				],
			},
		},
		type: 'lib',
	},
	{
		files: ['test/assets/**/*.md'],
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
)
