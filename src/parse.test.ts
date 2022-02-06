import { parseLambdaMessage } from './parse'

test('parsing a REPORT message should extract msg, duration, memory and requestid', () => {
  const message =
    'REPORT RequestId: f140eb5e-809d-43dd-b93a-439b218c1873	Duration: 998.63 ms	Billed Duration: 1000 ms Memory Size: 128 MB	Max Memory Used: 38 MB'
  const parsed = parseLambdaMessage(message)

  expect(parsed.duration).toBe(998)
  expect(parsed.memory).toBe(38)
  expect(parsed.memorySize).toBe(128)
  expect(parsed.reqid).toEqual('f140eb5e') // f140eb5e-809d-43dd-b93a-439b218c1873
  expect(parsed.msg).toEqual(
    'Duration: 998.63 ms	Billed Duration: 1000 ms Memory Size: 128 MB	Max Memory Used: 38 MB'
  )
})

test('parsing a START message should yield no msg field', () => {
  const parsed = parseLambdaMessage('START bla')
  expect(parsed.msg).toEqual('')
})

test('parsing a END message should yield no msg field', () => {
  const parsed = parseLambdaMessage('END bla')
  expect(parsed.msg).toEqual('')
})

test('parsing a normal message should yield msg and requestid', () => {
  const parsed = parseLambdaMessage(
    '2019-03-01T10:10:07.227Z\t75f445ce-bf71-4bdf-9826-0e3817425752\tElasticsearch processed a batch of 1 items in 3ms'
  )
  expect(parsed.msg).toEqual('Elasticsearch processed a batch of 1 items in 3ms')
  expect(parsed.reqid).toEqual('75f445ce-bf71-4bdf-9826-0e3817425752')
})

test('parsing a message with embedded json should merge all fields', () => {
  const parsed: any = parseLambdaMessage(
    '2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	INFO some message {"level":"warn", "field1": 1, "msg": "second message"}'
  )
  expect(parsed.msg).toEqual('some message - second message')
  expect(parsed.level).toEqual('warn')
  expect(parsed.field1).toEqual(1)
})

test('parsing a message with only embedded json should join messages without dash "-"', () => {
  const parsed: any = parseLambdaMessage(
    '2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	{"msg": "some message"}'
  )
  expect(parsed.msg).toEqual('some message')
})

test('parsing a message with curly braces but no json should log original message', () => {
  const parsed: any = parseLambdaMessage(
    '2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	some { curly braces }'
  )
  expect(parsed.msg).toEqual('some { curly braces }')
})

test('a message with text should produce a hash', () => {
  const parsed: any = parseLambdaMessage(
    '2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	some message'
  )
  expect(parsed.hash).toHaveLength(16)
})

test.each([
  ['DEBUG', 'debug'],
  ['INFO', 'info'],
  ['WARN', 'warn'],
  ['ERROR', 'error'],
])(
  'a message with prefixed with %s should be logged with the level "%s"',
  (prefix: string, expectedLevel: string) => {
    const parsed: any = parseLambdaMessage(
      `2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	${prefix} some message`
    )
    expect(parsed.msg).toEqual('some message')
    expect(parsed.level).toEqual(expectedLevel)
  }
)

test('should not duplicate message before embedded json without msg field', () => {
  const msg =
    '2019-09-18T10:58:41.440Z fd0ebd62-539f-41b0-a5f4-77cbcfc4d626 INFO message {"operation":"index"}'

  expect(parseLambdaMessage(msg).msg).toBe('message')
})

test('parsing an (unhandled) InvokeError should extract fields', () => {
  const invokeError = `2019-11-04T08:36:24.848Z 7f0f1a90-5dc4-409a-b737-e75bb81a72a8 ERROR Invoke Error
  {
      "errorType": "Error",
      "errorMessage": "some error message",
      "stack": [
          "Error: some error message",
          "    at _homogeneousError (/var/runtime/CallbackContext.js:13:12)",
          "    at Runtime.fail [as handler] (/var/task/webpack:/save-data/src/index.ts:22:13)"
      ]
  }`

  const fields = parseLambdaMessage(invokeError)
  expect(fields.reqid).toBe('7f0f1a90-5dc4-409a-b737-e75bb81a72a8')
  expect(fields.level).toBe('error')
  expect(fields.msg).toBe('some error message')
  expect(fields.stack).toBe(
    [
      'Error: some error message',
      '    at _homogeneousError (/var/runtime/CallbackContext.js:13:12)',
      '    at Runtime.fail [as handler] (/var/task/webpack:/save-data/src/index.ts:22:13)',
    ].join('\n')
  )
})

test('parsing an uncaughtException', () => {
  const uncaughtException = `2019-11-04T11:18:12.695Z undefined ERROR Uncaught Exception
  {
      "errorType": "Runtime.ImportModuleError",
      "errorMessage": "Error: Cannot find module 'aws-xray-sdk'",
      "stack": [
          "Runtime.ImportModuleError: Error: Cannot find module 'aws-xray-sdk'",
          "    at _loadUserApp (/var/runtime/UserFunction.js:100:13)"
      ]
  }`
  const fields = parseLambdaMessage(uncaughtException)
  expect(fields.level).toBe('error')
  expect(fields.msg).toBe("Cannot find module 'aws-xray-sdk'")
  expect(fields.reqid).toBe('undefined')
})
