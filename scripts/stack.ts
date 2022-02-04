import { readFileSync } from 'fs'
import { Stack } from '@atombrenner/cfn-stack'

const StackName = process.env.STACK_NAME
const ElasticUrl = process.env.ELASTIC_URL

async function main() {
  if (!StackName) throw 'Please provide a STACK_NAME'

  const template = readFileSync('./cloudformation.yml', 'utf-8')
  const stack = new Stack({ name: StackName, region: 'eu-central-1' })
  await stack.createOrUpdate(template, { ElasticUrl })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
