import { remarkConfig } from '@kitschpatrol/remark-config'

export default remarkConfig({
	rules: [['remarkValidateLinks', { repository: false }]],
})
