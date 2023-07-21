import { toBulk } from './elastic'

describe('toBulk', () => {
  it('should end body with a newline', () => {
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

  it('should generate a hash field for each msg', () => {
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

  it('should filter logs with "-ignore-" level', () => {
    const body = toBulk([
      { '@timestamp': '2000-01-01', app: 'app', env: 'env', level: '-ignore-', msg: '' },
    ])
    expect(body).toEqual('')
  })
})
