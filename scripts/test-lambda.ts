import { CloudWatchLogsEvent, CloudWatchLogsDecodedData } from 'aws-lambda'
import { gzipSync } from 'zlib'
import { handler } from '../lambda/index'

export function encode(event: CloudWatchLogsDecodedData): CloudWatchLogsEvent {
  const data = gzipSync(Buffer.from(JSON.stringify(event))).toString('base64')
  return { awslogs: { data } }
}

async function main() {
  const timestamp = Date.now()
  const event = {
    messageType: 'DATA_MESSAGE',
    owner: '123456789012',
    logGroup: 'my-app-dev',
    logStream: 'i-0d4f5d352541b5f8c/application.log',
    subscriptionFilters: ['Everything'],
    logEvents: [
      {
        id: '36662203685206665857122522209448141537241116769592410112',
        timestamp,
        message: `{"level":"info","msg":"some info message"}`,
      },
      {
        id: '36662203685206665857122522209448141537241116769592410113',
        timestamp,
        message: `{"level":"info","time":${
          timestamp + 1
        },"host":"www.atombrenner.de","path":"/some/path?bla=2","method":"GET","msg":"GET /some/path?bla=2"}`,
      },
      {
        id: '36662203685206665857122522209448141537241116769592410114',
        timestamp,
        message: `{"level":"warn","time:${
          timestamp + 2
        },memory":57483264,"msg":"some warning message"}`,
      },
      {
        id: '36662203685206665857122522209448141537241116769592410115',
        timestamp,
        message: `{"level":"error","time":${
          timestamp + 3
        },"err":{"type":"Error","message":"test error","stack":"Error: test error\\n    at handler (/app/.next/server/pages/api/bla.js:44:13)\\n    at Object.apiResolver (/app/node_modules/next/dist/server/api-utils.js:101:15)"},"msg":"error object logged with pino"}`,
      },
    ],
  }

  await handler(encode(event))
}

main().catch(console.error)
