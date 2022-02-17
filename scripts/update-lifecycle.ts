// Usage: npm run update:lifecycle

import YAML from 'yamljs'
import { putJson } from '../lib/elastic'

async function main() {
  const body = YAML.load('./elastic/lifecycle.yml')
  const result = await putJson('/_ilm/policy/daily-logs', body)
  console.log(result)
}

main()
  .then(() => console.log('Update Lifecycle Done'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
