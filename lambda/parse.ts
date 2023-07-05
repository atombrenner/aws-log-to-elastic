import { CloudWatchLogsDecodedData } from 'aws-lambda'

type SimpleValue = boolean | number | string
type SimpleRecord = Record<string, SimpleValue | SimpleValue[]>
type SimpleNestedRecord = Record<string, SimpleValue | SimpleValue[] | SimpleRecord>

export type LogDoc = {
  ['@timestamp']: string
  level: string
  app: string
  env: string
  msg?: string
} & SimpleRecord

export function toDocs({ logGroup, logStream, logEvents }: CloudWatchLogsDecodedData): LogDoc[] {
  const isLambda = logGroup.startsWith('/aws/lambda')
  const isApplication = logStream.endsWith('/application.log')

  if (!(isLambda || isApplication)) {
    console.log(`ignore logs from ${logGroup}/${logStream}}`)
    return []
  }

  const envAndApp = getEnvAndApp(logGroup)
  return logEvents.map(({ timestamp, message }) => {
    const [lambdaProps, remainingMessage] = isLambda ? parseLambdaProps(message) : [{}, message]
    return {
      level: 'none',
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
  runtime: string
}>

// 2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	INFO some message
const logPattern = /^([\d-]{10}T[\d:\.]{12}Z)\s+(\S*)\s.*(DEBUG|INFO|WARN|ERROR)\s*/
const reportPattern = /Duration: (\d+).*Billed Duration.*Memory Size: (\d+).*Memory Used: (\d+)/
const initStartPattern = /Runtime Version:\s*(\S*)\s*Runtime Version ARN:/

export function parseLambdaProps(message: string): [LambdaProps, string] {
  if (message.startsWith('START RequestId') || message.startsWith('END RequestId')) {
    // ignore Lambda START and STOP message as they don't add additional information
    return [{ level: 'lambda' }, ''] // logs with an empty string as message are ignored
  }

  if (message.startsWith('REPORT RequestId')) {
    const match = message.match(reportPattern)
    if (!match) return unknown(message)
    return [
      {
        level: 'lambda',
        reqid: message.substring(18, 54),
        duration: +match[1],
        memorySize: +match[2],
        memoryUsed: +match[3],
      },
      message.substring(message.indexOf('Duration')).replace(/\s*XRAY.*/, ''),
    ]
  }

  if (message.startsWith('INIT_START')) {
    const match = message.match(initStartPattern)
    if (!match) return unknown(message)
    return [{ level: 'lambda', runtime: match[1] }, message]
  }

  // check if we see a console.log from lambda runtime that looks like this
  // 2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	INFO some message
  const match = message.match(logPattern)
  if (!match) return unknown(message)

  return [
    { '@timestamp': match[1], level: match[3].toLowerCase(), reqid: match[2] },
    message.substring(match[0].length),
  ]
}

function unknown(message: string): [LambdaProps, string] {
  return [{ level: 'lambda' }, message]
}

export function parseMessage(message: string) {
  const startJson = message.indexOf('{')
  if (startJson < 0) return { msg: message }

  const parsed = tryParse(message.substring(startJson))

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

// to prevent field explosion in elastic search we disallow
// - more than 20 fields
// - numeric field names
// - deeply nested objects
function tryParse(text: string): SimpleNestedRecord {
  try {
    const parsed = JSON.parse(text)
    return isSimpleNestedRecord(parsed)
      ? parsed
      : { level: 'error', msg: 'too complex json, please fix logging:\n' + text }
  } catch {
    return { msg: text } // silently ignore JSON parsing because logs can contain literal curly braces if no json logger is used
  }
}

function isSimpleNestedRecord(record: unknown): record is SimpleNestedRecord {
  return (
    isStringRecord(record) &&
    Object.values(record).every((v) => isSimpleValue(v) || isSimpleArray(v) || isSimpleRecord(v))
  )
}

function isSimpleRecord(record: unknown): record is SimpleRecord {
  return (
    isStringRecord(record) &&
    Object.values(record).every((v) => isSimpleValue(v) || isSimpleArray(v))
  )
}

function isStringRecord(record: unknown): record is Record<string, unknown> {
  if (!record) return false
  if (typeof record !== 'object') return false
  if (Array.isArray(record)) return false
  const keys = Object.keys(record)
  if (keys.length > 20) return false
  if (!keys.every((key) => Number.isNaN(Number(key)))) return false
  return true
}

function isSimpleArray(array: unknown): array is SimpleValue[] {
  return Array.isArray(array) && array.every(isSimpleValue)
}

function isSimpleValue(value: unknown): value is SimpleValue {
  return ['boolean', 'number', 'string'].includes(typeof value)
}

function joinMsg(arg1: unknown, arg2: unknown) {
  const normalized = [arg1, arg2]
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean)

  return normalized[0] === normalized[1] ? normalized[0] : normalized.join(' ')
}
