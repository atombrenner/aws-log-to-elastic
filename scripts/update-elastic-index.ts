// Usage: npm run update
// Environment variable ELASTIC_LOGS must contain url with basic auth, Example:
// https://user:password@my-elastic-cluster.es.eu-central-1.aws.cloud.es.io:9243

import fetch from 'node-fetch'
import YAML from 'yamljs'

const baseUrl = process.env.ELASTIC_URL

async function putJson(url: string, body: unknown): Promise<string> {
  const response = await fetch(baseUrl + url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = (await response.text()) || '<no response text>'
    throw Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
  }

  return response.json()
}

async function updateTemplate() {
  const body = YAML.load('index-template.yml')
  const result = await putJson('/_template/logs', body)
  console.log(result)
}

async function updatePolicy() {
  const body = YAML.load('index-policy.yml')
  const result = await putJson('/_ilm/policy/logs', body)
  console.log(result)
}

async function main() {
  await updatePolicy()
  await updateTemplate()
}

main()
  .then(() => console.log('Done'))
  .catch(console.error)
