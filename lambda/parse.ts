import { CloudWatchLogsDecodedData } from 'aws-lambda'

export type LogDoc = {
  ['@timestamp']: string
  level: string
  app: string
  env: string
  msg?: string
} & Record<string, unknown>

export function toDocs({ logGroup, logStream, logEvents }: CloudWatchLogsDecodedData): LogDoc[] {
  const parseMessage = getMessageParser(logGroup, logStream)
  if (!parseMessage) {
    console.log(`no known parser for ${logGroup}/${logStream}}`)
    return []
  }

  const envAndApp = getEnvAndApp(logGroup)
  return logEvents.map((logEvent) => ({
    '@timestamp': new Date(logEvent.timestamp).toISOString(),
    ...envAndApp,
    ...parseMessage(logEvent.message),
  }))
}

function getMessageParser(logGroup: string, logStream: string) {
  if (logGroup.startsWith('/aws/lambda')) return parseLambdaMessage
  if (logStream.endsWith('/application.log')) return parseAppMessage
  return undefined
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
  hash?: string
  reqid?: string
  duration?: number
  memory?: number
  memorySize?: number
  stack?: string
} & Record<string, unknown>

export function parseAppMessage(message: string): LogEvent {
  // this either parses a pino message or plain text
  try {
    const pino = JSON.parse(message)
    return upliftPinoProps(pino)
  } catch {
    return { level: 'info', msg: message }
  }
}

export function parseLambdaMessage(message: string): LogEvent {
  const logEvent: LogEvent = { level: 'info', msg: '' }
  if (message.startsWith('REPORT')) {
    logEvent.level = 'lambda'
    logEvent.msg = message.substring(message.indexOf('Duration')).replace(/\s*XRAY.*/, '')
    logEvent.reqid = message.substring(18, 26)
    const match = message.match(
      /Duration: (\d+).*Billed Duration.*Memory Size: (\d+).*Memory Used: (\d+)/
    )
    logEvent.duration = +match![1]
    logEvent.memorySize = +match![2]
    logEvent.memory = +match![3]
  } else if (!(message.startsWith('START') || message.startsWith('END'))) {
    const match = message.match(/^\S+\s+(\S+)/)
    if (match) {
      logEvent.reqid = match[1]
      Object.assign(logEvent, parseLambdaMessageMessage(message.substring(match[0].length)))
    } else {
      logEvent.msg = message
    }
  }
  return logEvent
}

// the message written to console.log inside the log message from AWS lambda
function parseLambdaMessageMessage(message: string): LogEvent {
  const { level, msg } = getLambdaLevelAndMsg(message)

  const start = msg.indexOf('{')
  if (start >= 0) {
    const json = msg.substring(start)
    const initialMsg = msg.substring(0, start).trim()
    const parsed = tryParse(json)
    if (parsed) {
      if (parsed.errorType && parsed.errorMessage && Array.isArray(parsed.stack)) {
        return {
          msg: parsed.errorMessage.replace(/^Error:\s*/, ''),
          stack: parsed.stack.join('\n'),
          level: 'error',
        }
      } else {
        return upliftPinoProps({
          level,
          ...parsed,
          msg: joinMsg(initialMsg, parsed.msg),
        })
      }
    }
  }
  return { level, msg }
}

function tryParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const lambdaLevelPattern = /^\s*(DEBUG|INFO|WARN|ERROR)\s*/i

function getLambdaLevelAndMsg(message: string): { msg: string; level: string } {
  const levelMatch = message.match(lambdaLevelPattern)
  if (levelMatch) {
    return { msg: message.substring(levelMatch[0].length), level: levelMatch[1].toLowerCase() }
  } else {
    return { msg: message.trim(), level: 'info' }
  }
}

type PinoMessage = {
  level: string
  msg?: string
  time: number
  err?: {
    message?: string
    stack: string
  }
} & Record<string, unknown>

function upliftPinoProps(pino: PinoMessage): LogEvent {
  const { msg, err, time, ...rest } = pino
  if (typeof time === 'number' && time > 0) {
    rest['@timestamp'] = new Date(time).toISOString()
  }
  if (err) {
    rest.msg = joinMsg(msg, err.message)
    rest.stack = err.stack
  } else {
    rest.msg = msg
  }
  return rest as LogEvent
}

const joinMsg = (msg1: string | undefined, msg2: string | undefined) =>
  [msg1, msg2].filter(Boolean).join(' - ')
