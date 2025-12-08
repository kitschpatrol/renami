import filenamify from 'filenamify'
// const result = filenamify('"', { replacement: ' ' })
const result = filenamify('"', { replacement: ' ' })
console.log('----------------------------------')
console.log('"' + result + '"')
console.log('----------------------------------')

import { getSafeFilename } from '../src/lib/utilities/string'
const result2 = getSafeFilename('', 'CustomDefault')
console.log(result2)
