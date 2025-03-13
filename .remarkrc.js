import { remarkConfig } from '@kitschpatrol/remark-config'

export default remarkConfig({
	rules: [
		['remarkValidateLinks', { repository: false }],
		['remark-lint-no-file-name-irregular-characters', false],
	],
})
