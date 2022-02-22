import fetch from 'node-fetch'
import { createHash } from 'crypto'
import { LogDoc } from './parse'

const bulkUrl = process.env.ELASTIC_URL + '/_bulk'

export async function postToElastic(docs: LogDoc[]): Promise<void> {
  const body = toBulk(docs)
  if (body) {
    const response = await postBulk(body)
    console.info(`posted ${response.items.length} entries in ${response.took}ms`)
    if (response.errors) {
      response.items
        .filter((item) => item.create && item.create.error)
        .forEach((item) => {
          console.error(JSON.stringify(item.create.error, null, 2))
        })
    }
  } else {
    console.info('nothing to post')
  }
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

type BulkCreateResponse = {
  errors: boolean
  took: number
  items: { create: { status: string; error: { reason: string } } }[]
}

async function postBulk(body: string): Promise<BulkCreateResponse> {
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
