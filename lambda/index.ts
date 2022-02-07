import { CloudWatchLogsEvent } from 'aws-lambda'
import { decode } from './decode'
import { postToElastic } from './elastic'
import { toDocs } from './parse'

export async function handler(event: CloudWatchLogsEvent) {
  try {
    const data = decode(event)
    const docs = toDocs(data)
    const summary = await postToElastic(docs)
    console.log(summary)
  } catch (error) {
    console.error(error)
    throw error
  }
}
