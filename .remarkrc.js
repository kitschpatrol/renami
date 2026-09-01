import { remarkConfig } from '@kitschpatrol/remark-config'

export default remarkConfig({
	rules: [['remark-lint-no-file-name-irregular-characters', false]],
})
