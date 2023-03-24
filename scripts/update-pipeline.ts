// Usage: npm run update:pipeline

import YAML from 'yamljs'
import { putJson } from '../lib/elastic'

async function main() {
  const body = YAML.load('./elastic/pipeline.yml')
  const result = await putJson('/_ingest/pipeline/daily-logs', body)
  console.log(result)
}

main()
  .then(() => console.log('Update Ingest Pipeline Done'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
