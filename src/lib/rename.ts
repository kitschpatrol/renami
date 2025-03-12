import { deepmerge } from 'deepmerge-ts'
import { type FileAdapter, getDefaultFileAdapter } from './utilities/file'

const defaultRenameOptions: RenameOptions = {
	action(
		filePath: string,
		// TODO better YAML / frontmatter type
		frontmatter: Record<string, unknown> | undefined,
		body: string | undefined,
	): string {
		return ''
	},
	dryRun: false,
	fileAdapter: undefined, // Must be passed in later, deepmerge will not work
}

type RenameOptions = {
	action: () => string
	dryRun: boolean
	fileAdapter: FileAdapter | undefined
}

/**
 * Rename files based on the provided options.
 */
export async function renameFiles(
	files: string[],
	options?: Partial<RenameOptions>,
): Promise<void> {
	const {
		action,
		dryRun,
		fileAdapter = await getDefaultFileAdapter(),
	} = deepmerge(defaultRenameOptions, options ?? {})

	console.log('----------------------------------')
	console.log('files:', files)
	console.log('action:', action)
	console.log('dryRun:', dryRun)
	console.log('fileAdapter:', fileAdapter)

	// if (dryRun) {
	// 	console.log(`Would rename ${filePath} to ${newPath}`)
	// 	return
	// }

	// if (fileAdapter === undefined) {
	// 	throw new Error('No file adapter provided')
	// }

	// await fileAdapter.rename(filePath, newPath)
}
