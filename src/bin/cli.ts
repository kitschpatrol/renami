#!/usr/bin/env node

import prettyMilliseconds from 'pretty-ms'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { version } from '../../package.json'
import { log } from '../lib'

const startTime = performance.now()
const yargsInstance = yargs(hideBin(process.argv))

await yargsInstance
	.scriptName('renami')
	.command(
		'$0',
		'Command description',
		() => {},
		async () => {
			log.verbose = true
			log.info('Hello world!')
			log.info(`Renamed files in ${prettyMilliseconds(performance.now() - startTime)}`)
		},
	)
	.demandCommand(1)
	.alias('h', 'help')
	.version(version)
	.alias('v', 'version')
	.help()
	.wrap(process.stdout.isTTY ? Math.min(120, yargsInstance.terminalWidth()) : 0)
	.parse()
