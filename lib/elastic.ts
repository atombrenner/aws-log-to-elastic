import fetch from 'node-fetch'

// Environment variable ELASTIC_URL must contain url with basic auth, Example:
// https://user:password@my-elastic-cluster.es.eu-central-1.aws.cloud.es.io:9243
const baseUrl = process.env.ELASTIC_URL ?? ''
if (!baseUrl) throw Error('ELASTIC_URL is undefined')

const fetchJson =
  (method: 'PUT' | 'POST' | 'DELETE') =>
  async (url: string, body?: unknown): Promise<any> => {
    const response = await fetch(baseUrl + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = (await response.text()) || '<no response text>'
      throw Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
    }

    return await response.json()
  }

export const putJson = fetchJson('PUT')
export const postJson = fetchJson('POST')
export const deleteJson = fetchJson('DELETE')
