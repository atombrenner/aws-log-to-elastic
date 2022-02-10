import { CloudWatchLogsDecodedData } from 'aws-lambda'

export type LogDoc = {
  ['@timestamp']: string
  level: string
  app: string
  env: string
  msg?: string
} & Record<string, unknown>

export function toDocs({ logGroup, logStream, logEvents }: CloudWatchLogsDecodedData): LogDoc[] {
  const isLambda = logGroup.startsWith('/aws/lambda')
  const isApplication = logStream.endsWith('/application.log')

  if (!(isLambda || isApplication)) {
    console.log(`ignore logs from ${logGroup}/${logStream}}`)
    return []
  }

  const envAndApp = getEnvAndApp(logGroup)
  return logEvents.map(({ timestamp, message }) => {
    const [lambdaProps, remainingMessage] = isLambda ? parseLambdaProps(message) : [{}, '']
    return {
      level: 'info',
      '@timestamp': new Date(timestamp).toISOString(),
      ...envAndApp,
      ...lambdaProps,
      ...parseMessage(remainingMessage),
    }
  })
}

// convention of how to extract env and app from log group
function getEnvAndApp(logGroup: string): { env: string; app: string } {
  // logGroup = "/aws/lambda/name-of-lambda-function-env"
  const parts = logGroup.split('/')
  const name = parts[parts.length - 1]
  const split = name.lastIndexOf('-')
  return { env: name.substring(split + 1), app: name.substring(0, split) }
}

export type LogEvent = {
  level: string
  msg: string
  stack?: string
} & Record<string, unknown>

export type LambdaProps = Partial<{
  '@timestamp': string
  level: string
  reqid: string
  duration: number
  memoryUsed: number
  memorySize: number
}>

// 2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	INFO some message
const lambdaLogPattern = /^([\d-]{10}T[\d:\.]{12}Z)\s+(\S*)\s.*(DEBUG|INFO|WARN|ERROR)\s*/
const lambdaReportPattern =
  /Duration: (\d+).*Billed Duration.*Memory Size: (\d+).*Memory Used: (\d+)/

export function parseLambdaProps(message: string): [LambdaProps, string] {
  if (message.startsWith('START RequestId') || message.startsWith('END RequestId')) {
    // ignore Lambda START and STOP message as they don't add additional information
    return [{}, '']
  }

  if (message.startsWith('REPORT RequestId')) {
    const match = message.match(lambdaReportPattern)
    if (!match) return [{}, message]
    return [
      {
        level: 'lambda',
        reqid: message.substring(18, 26),
        duration: +match![1],
        memorySize: +match![2],
        memoryUsed: +match![3],
      },
      message.substring(message.indexOf('Duration')).replace(/\s*XRAY.*/, ''),
    ]
  }

  // check if we see a console.log from lambda runtime that looks like this
  // 2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	INFO some message
  const match = message.match(lambdaLogPattern)
  if (!match) return [{}, message]

  return [
    { '@timestamp': match[1], level: match[3].toLowerCase(), reqid: match[2] },
    message.substring(match[0].length),
  ]
}

export function parseMessage(message: string) {
  const startJson = message.indexOf('{')
  if (startJson < 0) return { msg: message }

  const parsed = tryParse(message.substring(startJson))
  if (!parsed) return { msg: message }

  transformLambdaError(parsed)
  transformPinoTime(parsed)
  transformPinoErr(parsed)
  parsed.msg = joinMsg(message.substring(0, startJson), parsed.msg)

  return parsed
}

function transformLambdaError(parsed: Record<string, unknown>) {
  if (parsed.errorType && typeof parsed.errorMessage === 'string' && Array.isArray(parsed.stack)) {
    parsed.msg = parsed.errorMessage.replace(/^Error:\s*/, '')
    parsed.stack = parsed.stack.join('\n')
    parsed.level = 'error'
    delete parsed.errorType
    delete parsed.errorMessage
  }
}

function transformPinoTime(parsed: Record<string, unknown>) {
  if (typeof parsed.time === 'number' && parsed.time > 0) {
    parsed['@timestamp'] = new Date(parsed.time).toISOString()
    delete parsed.time
  }
}

function transformPinoErr(parsed: Record<string, unknown>) {
  if (parsed.err && typeof parsed.err === 'object') {
    const err = parsed.err as { message?: string; stack?: string }
    parsed.msg = joinMsg(parsed.msg, err.message)
    parsed.stack = err.stack
    delete parsed.err
  }
}

function tryParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const joinMsg = (...args: unknown[]) =>
  args
    .filter((s): s is string => Boolean(s) && typeof s === 'string')
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean)
    .join(' - ')
