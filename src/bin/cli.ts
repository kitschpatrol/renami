#!/usr/bin/env node

import prettyMilliseconds from 'pretty-ms'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import type { FileRenameReport } from '../lib/rename-files'
import { version } from '../../package.json'
import { renami } from '../lib'
import log from '../lib/utilities/log'

function logFileStatus(file: FileRenameReport['files'][number]): void {
	switch (file.status) {
		case 'conflict': {
			log.error(`Conflict: ${file.filePathOriginal} → ${file.filePathRenamed}`)
			break
		}

		case 'error': {
			log.error(`Error renaming: ${file.filePathOriginal}`)
			break
		}

		case 'renamed': {
			log.info(`${file.filePathOriginal} → ${file.filePathRenamed}`)
			break
		}

		case 'scheduled':
		case 'unchanged': {
			// Nothing to report
			break
		}
	}
}

await yargs(hideBin(process.argv))
	.scriptName('renami')
	.command(
		'$0 [options]',
		'Rename files using config. Searches for a config file if not provided, failing if none is found.',
		(yargsInstance) =>
			yargsInstance
				.option('config', {
					alias: 'c',
					describe:
						'Path to config file. If not provided, a config file will be searched for automatically.',
					type: 'string',
				})
				.option('verbose', {
					default: false,
					describe: 'Enable verbose logging.',
					type: 'boolean',
				}),
		async ({ config, verbose }) => {
			if (verbose) {
				log.verbose = true
			}

			const report = await renami({ config })

			for (const rule of report.rules) {
				log.info(`Pattern: ${rule.pattern.join(', ')}`)
				const renamedCount = rule.report.files.filter((f) => f.status === 'renamed').length
				log.info(`${rule.report.dryRun ? 'Would rename' : 'Renamed'} ${renamedCount} files`)

				for (const file of rule.report.files) {
					logFileStatus(file)
				}
			}

			log.info(`Rename completed in ${prettyMilliseconds(report.duration)}`)

			if (report.rules.length === 0) {
				log.warn('No files were renamed.')
				process.exit(1)
			}
		},
	)
	.help()
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	// Some maneuvering to get full-width help output via non-ttys for parsing
	.wrap(process.stdout.isTTY ? Math.min(120, yargs().terminalWidth()) : 0)
	.parse()
