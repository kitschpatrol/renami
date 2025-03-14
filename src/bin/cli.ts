#!/usr/bin/env node

import prettyMilliseconds from 'pretty-ms'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { version } from '../../package.json'
import { defaultOptions, log, rename, renameFiles } from '../lib'
import { getDefaultFileAdapter } from '../lib/utilities/file'
import { globby } from 'globby'

const startTime = performance.now()
const yargsInstance = yargs(hideBin(process.argv))

await yargsInstance
	.scriptName('renami')
	.command(
		'$0',
		'Rename files',
		(yargs) => {
			return yargs
				.positional('pattern', {
					describe: 'Glob pattern for files to rename',
					type: 'string',
					demandOption: true,
				})
				.option('config', {
					alias: 'c',
					describe: 'Path to config file. Config will be detected automatically if not provided.',
					type: 'string',
				})

				.option('case', {
					alias: 'c',
					describe: 'Case style for renamed files',
					choices: ['preserve', 'camel', 'kebab', 'pascal', 'sentence', 'snake', 'constant'],
					default: defaultOptions.caseType,
				})
				.option('dry-run', {
					alias: 'd',
					describe: 'Preview rename operations without making changes',
					type: 'boolean',
					default: defaultOptions.dryRun,
				})
				.option('max-length', {
					alias: 'm',
					describe: 'Maximum filename length',
					type: 'number',
					default: defaultOptions.maxLength,
				})
				.option('dry-run', {
					alias: 'd',
					default: false,
					describe: 'Preview rename operations without making changes',
					type: 'boolean',
				})
				.option('verbose', {
					default: false,
					describe: 'Enable verbose logging.',
					type: 'boolean',
				})
		},
		async (argv) => {
			if (argv.verbose) {
				log.verbose = true
			}

			const options: {
				config?: string
				configSearchFrom?: string
				fileAdapter?: any
			} = {}

			if (argv.config) {
				options.config = argv.config
			}

			if (argv['config-search-from']) {
				options.configSearchFrom = argv['config-search-from']
			}

			// If dry-run is specified, override config
			if (argv.dryRun) {
				options.config = {
					options: {
						...defaultOptions,
						dryRun: true,
					},
				}
			}

			const report = await rename(options)

			if (report) {
				for (const rule of report.rules) {
					log.info(`Pattern: ${rule.pattern}`)
					log.info(
						`${rule.report.dryRun ? 'Would rename' : 'Renamed'} ${rule.report.files.filter((f) => f.status === 'renamed').length} files`,
					)

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

				log.info(`Operation completed in ${prettyMilliseconds(report.duration)}`)
			}
		},
	)
	.command(
		'files [pattern]',
		'Rename specific files matching a glob pattern',
		(yargs) => {
			return yargs
				.positional('pattern', {
					describe: 'Glob pattern for files to rename',
					type: 'string',
					demandOption: true,
				})
				.option('case', {
					alias: 'c',
					describe: 'Case style for renamed files',
					choices: ['preserve', 'camel', 'kebab', 'pascal', 'sentence', 'snake', 'constant'],
					default: defaultOptions.caseType,
				})
				.option('dry-run', {
					alias: 'd',
					describe: 'Preview rename operations without making changes',
					type: 'boolean',
					default: defaultOptions.dryRun,
				})
				.option('max-length', {
					alias: 'm',
					describe: 'Maximum filename length',
					type: 'number',
					default: defaultOptions.maxLength,
				})
				.option('verbose', {
					alias: 'V',
					describe: 'Show verbose output',
					type: 'boolean',
				})
		},
		async (argv) => {
			if (argv.verbose) {
				log.verbose = true
			}

			const pattern = argv.pattern as string
			const fileAdapter = await getDefaultFileAdapter()
			const filePaths = await globby(pattern, { absolute: true, gitignore: false, onlyFiles: true })

			if (filePaths.length === 0) {
				log.error(`No files found matching pattern: ${pattern}`)
				return
			}

			log.info(`Found ${filePaths.length} files matching pattern: ${pattern}`)

			const options = {
				caseType: argv.case,
				dryRun: argv.dryRun,
				maxLength: argv.maxLength,
			}

			const report = await renameFiles({
				fileAdapter,
				filePaths,
				options,
			})

			// Display results
			log.info(
				`${report.dryRun ? 'Would rename' : 'Renamed'} ${report.files.filter((f) => f.status === 'renamed').length} files`,
			)

			for (const file of report.files) {
				if (file.status === 'renamed') {
					log.info(`${file.filePathOriginal} → ${file.filePathRenamed}`)
				} else if (file.status === 'error') {
					log.error(`Error renaming: ${file.filePathOriginal}`)
				} else if (file.status === 'conflict') {
					log.error(`Conflict: ${file.filePathOriginal} → ${file.filePathRenamed}`)
				}
			}

			log.info(`Operation completed in ${prettyMilliseconds(report.duration)}`)
		},
	)
	.demandCommand(1, 'Please specify a command or provide a pattern of files to rename')
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	.help()
	.wrap(process.stdout.isTTY ? Math.min(120, yargsInstance.terminalWidth()) : 0)
	.parse()
