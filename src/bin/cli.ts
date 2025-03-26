#!/usr/bin/env node

import prettyMilliseconds from 'pretty-ms'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { version } from '../../package.json'
import { log, rename } from '../lib'

await yargs(hideBin(process.argv))
	.scriptName('renami')
	.command(
		'$0 [options]',
		'Rename files using config. Searches for a config file if not provided, failing if none is found.',
		(yargs) =>
			yargs
				.option('config', {
					alias: 'c',
					describe:
						'Path to config file. If not provided, a config file will be searched for automatically.',
					type: 'string',
				})
				.option('verbose', {
					describe: 'Enable verbose logging.',
					type: 'boolean',
					default: false,
				}),
		async ({ config, verbose }) => {
			if (verbose) {
				log.verbose = true
			}

			const report = await rename({ config })

			for (const rule of report.rules) {
				log.info(`Pattern: ${rule.pattern}`)
				const renamedCount = rule.report.files.filter((f) => f.status === 'renamed').length
				log.info(`${rule.report.dryRun ? 'Would rename' : 'Renamed'} ${renamedCount} files`)

				for (const file of rule.report.files) {
					if (file.status === 'renamed') {
						log.info(`${file.filePathOriginal} → ${file.filePathRenamed}`)
					} else if (file.status === 'error') {
						log.error(`Error renaming: ${file.filePathOriginal}`)
					} else if (file.status === 'conflict') {
						log.error(`Conflict: ${file.filePathOriginal} → ${file.filePathRenamed}`)
					}
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
