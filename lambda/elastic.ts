import fetch from 'node-fetch'
import { createHash } from 'crypto'
import { LogDoc } from './parse'

const bulkUrl = process.env.ELASTIC_URL + '/_bulk'

export async function postToElastic(docs: LogDoc[]): Promise<string> {
  const body = toBulk(docs)
  return body ? summary(await postBulk(body)) : 'nothing to post'
}

export function toBulk(docs: LogDoc[]): string {
  const bulk: string[] = []
  for (const doc of docs) {
    if (doc.msg) {
      const day = doc['@timestamp'].substring(0, 10)
      bulk.push(JSON.stringify({ create: { _index: `daily-logs-${day}` } }))
      doc.hash ||= hash(doc.msg)
      bulk.push(JSON.stringify(doc))
    }
  }
  bulk.push('')
  return bulk.join('\n')
}

type BulkIndexResponse = {
  errors: boolean
  took: number
  items: { index: { status: string; error: { reason: string } } }[]
}

async function postBulk(body: string): Promise<BulkIndexResponse> {
  const response = await fetch(bulkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
    },
    body,
  })

  if (!response.ok) {
    const errorText = (await response.text()) || '<no response text>'
    throw Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
  }

  return await response.json()
}

function hash(message: string): string {
  return createHash('sha1').update(message).digest('hex').substring(0, 16)
}

function summary(result: BulkIndexResponse) {
  let msg = `posted ${result.items.length} entries in ${result.took}ms`
  if (result.errors) {
    msg += result.items
      .filter((item) => item.index && item.index.error)
      .map((item) => ({ status: item.index.status, reason: item.index.error.reason }))
      .reduce((msg, err) => `${msg}\n${err.status} -> ${err.reason}`, `\nERRORS:`)
  }
  return msg
}
