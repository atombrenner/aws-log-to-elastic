import { decode } from './decode'

describe('decode', () => {
  const stringify = (object: unknown) => JSON.stringify(object, null, 2)

  test('ec2 event', () => {
    const event = {
      awslogs: {
        data: 'H4sIAAAAAAAAA7WUUW/aMBDHv0qUp1YCEjtxSCJNE9pYn9ZJwNtSVSY5wCWxM9uBoarffZfQUVSmirEVCcn5393Pd2f7Ht0KjOFLmO1qcFP382g2uv86nk5HN2O356qtBI0yoUHIomGc+ISiXKrljVZNjZZq1+d13S9gs9enVgOv0CD6fhEuWBEwykIyZ4s499CzFDm3QskB+mKEaeYm16JupS+itKCNm353xxvQO7sScunedVgUpG1Nj64okB5EUUSpH0Qxoz6uWcyGhFJGUUzCMCYhYcGQhoSQaBglLMGlT7rkrcCSLa8wexKFNEl8f0hIQHq/W4H4x8wtYQNl5qaZK+RCZW4v6yKz11GZW5ll54dpLqFwtsKunFpIjHlyn3r/lnDwHgmvlLGd43a7HXCrqrkGiQc9KKALq7lddXbPqAq89vPjvOQfaGetwK5U0dlvxrO99I4dCC/pwJZr+eaRQaX0Dg1sGMYBjcKjIrjTRuPVc57h/6MKdkkVoLXSb5WBDqhijMXX24WMDyGH5FG1uK/zQsMk8vWLe+oc2TPp4I9bZ8VlUYJ2rtpX6w0k/LSeAY0PEy/EEgzKwsNbMXgwaRimJLh+if02f4DcDtBjAkaVmwNGqgLuK1U0JQI6ZCHMgYv+/caK0rRM7FpK2BG01irHmmYiX5uRLCbQ7oFjwzhXLTYVEqeH5KX37OhZbtb3PxpowKRJlB6zuNnJ3LnFBG4xdNptP9CNHNXirExbob9ft7kGJEmTE/xzFxbyLOScGzhChnGUBsMTZjtBd59WkK9nuoGzwDio7Z5JiJ8G9IQ52TvAT8hx8ZdMynz8n9HaS5rAkjilp419Bd/f1AngUeM1vmCbwGcp9a/xnR+Nge45OKo7Q+ePg+3u6Rd1SiSTPgcAAA==',
      },
    }

    const decoded = decode(event)

    expect(stringify(decoded)).toEqual(
      stringify({
        messageType: 'DATA_MESSAGE',
        owner: '123456789012',
        logGroup: 'my-app-dev',
        logStream: 'i-0d4f5d352541b5f8c/application.log',
        subscriptionFilters: ['Everything'],
        logEvents: [
          {
            id: '36662203685206665857122522209448141537241116769592410112',
            timestamp: 1642990071131,
            message: '{"level":"info","time":1642990071131,"msg":"logged with pino"}',
          },
          {
            id: '36662203685206665857122522209448141537241116769592410113',
            timestamp: 1642990071131,
            message:
              '{"level":"info","time":1642990071131,"host":"www.atombrenner.de","path":"/some/path?bla=2","method":"GET","msg":"logged with pino"}',
          },
          {
            id: '36662203685206665857122522209448141537241116769592410114',
            timestamp: 1642990071131,
            message:
              '{"level":"warn","time":1642990071131,"memory":57483264,"msg":"a warning message"}',
          },
          {
            id: '36662203685206665857122522209448141537241116769592410115',
            timestamp: 1642990071131,
            message:
              '{"level":"error","time":1642990071131,"err":{"type":"Error","message":"test error","stack":"Error: test error\\n    at handler (/app/.next/server/pages/api/bla.js:44:13)\\n    at Object.apiResolver (/app/node_modules/next/dist/server/api-utils.js:101:15)\\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\\n    at async NextNodeServer.runApi (/app/node_modules/next/dist/server/next-server.js:319:9)\\n    at async Object.fn (/app/node_modules/next/dist/server/base-server.js:486:37)\\n    at async applyCheckTrue (/app/node_modules/next/dist/server/router.js:110:32)\\n    at async Router.execute (/app/node_modules/next/dist/server/router.js:250:25)\\n    at async NextNodeServer.run (/app/node_modules/next/dist/server/base-server.js:598:29)\\n    at async NextNodeServer.handleRequest (/app/node_modules/next/dist/server/base-server.js:305:20)"},"msg":"error object logged with pino"}',
          },
        ],
      })
    )
  })

  test('lambda event', () => {
    const event = {
      awslogs: {
        data: 'H4sIAAAAAAAAAzWQS2/bMBCE/4pA9BhVfEurm4EquaQn69TYKChxZROQKIOkGwRB/ns3fVxnBzP7zTvbMGd3wfHthqxn3w7j4ef34Xg8PA3sge2vERPJQiptbNsBF5Lkdb88pf1+o0vjXnOzum3yrrml3dcJo8dU53Jflr/WY0noNvJKLqDhspFt8/Ll+TAOx/FsHGikVORLqyfgnTXKe+TeKO6nzlBEvk95TuFWwh4fw1owZda/sOEXprdyDfHCzn96SIjl8/TOgqc6ehm0MpYrKUAZ0YHQphNWKSlNpwA4MQkDHEBr1bVGEqIES5Ul0CzFbUQohLTatEYr8fB/rH8sNZe1bEfBew29Ml/J8uNUwFrftd7W2mtea6NsPYGEWksL2LqFz60+lWF1uYQ5o0vztaLlZopGX7lqcoWUfalEFQpuuQqx0lvuT9HFvVwxVWuI+GnwrrhTZB/nj992Gz0uxwEAAA==',
      },
    }

    const decoded = decode(event)

    expect(stringify(decoded)).toEqual(
      stringify({
        messageType: 'DATA_MESSAGE',
        owner: '123456789012',
        logGroup: '/aws/lambda/prod-render-stuff',
        logStream: '2019/02/27/[$LATEST]5a94e012e0f74b908653dde0d530db85',
        subscriptionFilters: ['Everything'],
        logEvents: [
          {
            id: '34594356032193518914581633225839904561590994438752567296',
            timestamp: 11264575431,
            message:
              '2019-02-27T10:49:35.431Z\t966d87d6-4d40-4536-b929-4269e7af0c74\tElasticsearch processed a batch of 1 items in 4ms:\n' +
              'another line of data\n',
          },
        ],
      })
    )
  })
})
