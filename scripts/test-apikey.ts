async function main() {
  if (!process.env.ELASTIC_URL) throw Error('missing ELASTIC_URL')
  if (!process.env.ELASTIC_APIKEY) throw Error('missing ELASTIC_APIKEY')
  const url = new URL(process.env.ELASTIC_URL)

  // @ts-expect-error -- fetch is not part of nodes types yet
  const response = await fetch(`${url.protocol}//${url.host}/daily-logs-/_doc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      Authorization: `ApiKey ${process.env.ELASTIC_APIKEY}`,
    },
    body: JSON.stringify({
      msg: 'test error',
      level: 'info',
      env: 'local',
      app: 'test',
      path: '/some/path',
      ua: 'some userAgent',
    }),
  })
  console.log(response.status, response.statusText)
  console.log(await response.text())
}

// npx ts-node -T scripts/test-apikey.ts
main().catch(console.error)
