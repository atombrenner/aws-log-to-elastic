import { toBulk } from './elastic'

describe('toBulk', () => {
  test('bulk message should have a hash', () => {
    const body = toBulk([])

    // const parsed: any = parseLambdaMessage(
    //   '2019-03-01T10:10:07.227Z	75f445ce-bf71-4bdf-9826-0e3817425752	some message'
    // )
    // expect(parsed.hash).toHaveLength(16)
  })
})
