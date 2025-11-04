import filenamify from 'filenamify'
const result = filenamify('"', { replacement: ' ' })
console.log('----------------------------------')
console.log('"' + result + '"')
console.log('----------------------------------')
