// Usage: npm run update:template

import YAML from 'yamljs'
import { putJson } from '../lib/elastic'

async function main() {
  const body = YAML.load('./elastic/template.yml')
  const result = await putJson('/_template/daily-logs', body)
  console.log(result)
}

main()
  .then(() => console.log('Update Template Done'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
