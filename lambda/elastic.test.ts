import { toBulk } from './elastic'

describe('toBulk', () => {
  test('bulk data should end with a newline', () => {
    const body = toBulk([
      {
        '@timestamp': '2000-01-31T12:00:00.000Z',
        app: 'app',
        env: 'env',
        level: 'level',
        msg: 'msg',
      },
    ])

    expect(body).toMatch(/\n$/)
  })

  test('bulk message should have a hash', () => {
    const body = toBulk([
      {
        '@timestamp': '2000-01-31T12:00:00.000Z',
        app: 'app',
        env: 'env',
        level: 'level',
        msg: 'msg',
      },
    ])

    expect(body).toMatch(/\n$/)
    const lines = body.split('\n')
    const lastDoc = JSON.parse(lines[lines.length - 2])
    expect(lastDoc).toHaveProperty('hash')
    expect(lastDoc.hash).toHaveLength(16)
  })
})
