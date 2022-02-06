import { CloudWatchLogsDecodedData } from 'aws-lambda'
import { createHash } from 'crypto'

export type LogDoc = {
  ['@timestamp']: string
  level: string
  app: string
  env: string
  msg?: string
}

export function toDocs(data: CloudWatchLogsDecodedData): LogDoc[] {
  if (data.logGroup.startsWith('/aws/lambda/')) {
    const envAndApp = getEnvAndApp(data.logGroup)
    return data.logEvents.map((logEvent) => ({
      '@timestamp': new Date(logEvent.timestamp).toISOString(),
      ...envAndApp,
      ...parseLambdaMessage(logEvent.message),
    }))
  }
  return []
}

function getEnvAndApp(logGroup: string): { env: string; app: string } {
  const name = logGroup.split('/')[3] // "/aws/lambda/name-of-lambda-function"
  const split = name.indexOf('-')
  return { env: name.substring(0, split), app: name.substring(split + 1) }
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
      Object.assign(logEvent, parseMessage(message.substring(match[0].length)))
    } else {
      logEvent.msg = message
    }
  }
  if (!logEvent.hash && logEvent.msg) {
    logEvent.hash = hash(logEvent.msg)
  }
  return logEvent
}

function parseMessage(message: string): LogEvent {
  const { level, msg } = getLevelAndMsg(message)

  const start = msg.indexOf('{')
  if (start >= 0) {
    const json = msg.substring(start)
    const initialMsg = msg.substring(0, start).trim()
    try {
      const parsed = JSON.parse(json)
      if (parsed.errorType && parsed.errorMessage && Array.isArray(parsed.stack)) {
        return {
          msg: parsed.errorMessage.replace(/^Error:\s*/, ''),
          stack: parsed.stack.join('\n'),
          level: 'error',
        }
      } else {
        return {
          level,
          ...parsed,
          msg: [initialMsg, parsed.msg].filter(Boolean).join(' - '),
        }
      }
    } catch {}
  }
  return { level, msg }
}

const levelPattern = /^\s*(DEBUG|INFO|WARN|ERROR)\s*/i

function getLevelAndMsg(message: string): { msg: string; level: string } {
  const levelMatch = message.match(levelPattern)
  if (levelMatch) {
    return { msg: message.substring(levelMatch[0].length), level: levelMatch[1].toLowerCase() }
  } else {
    return { msg: message.trim(), level: 'info' }
  }
}

function hash(message: string): string {
  return createHash('sha1').update(message).digest('hex').substring(0, 16)
}
