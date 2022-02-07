import { CloudWatchLogsEvent, CloudWatchLogsDecodedData } from 'aws-lambda'
import { gunzipSync } from 'zlib'

export function decode(event: CloudWatchLogsEvent): CloudWatchLogsDecodedData {
  const payloadAsZip = Buffer.from(event.awslogs.data, 'base64')
  const payloadAsString = gunzipSync(payloadAsZip).toString('utf8')
  return JSON.parse(payloadAsString) as CloudWatchLogsDecodedData
}
