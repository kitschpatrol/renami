import { remarkConfig } from '@kitschpatrol/remark-config'

export default remarkConfig({
	rules: [
		['remarkValidateLinks', { repository: false }], // TODO remove once pushed
		['remark-lint-no-file-name-irregular-characters', false],
	],
})
