import { STS } from '@aws-sdk/client-sts'
import { CloudWatchLogs, DescribeLogGroupsCommandOutput } from '@aws-sdk/client-cloudwatch-logs'

const StackName = process.env.STACK_NAME

const cw = new CloudWatchLogs({ maxAttempts: 6 })
const sts = new STS({})

const log = (value: unknown) => console.dir(value, { depth: null })

async function* getLogGroups() {
  let response: DescribeLogGroupsCommandOutput | undefined
  do {
    response = await cw.describeLogGroups({ nextToken: response?.nextToken, limit: 50 })
    for (const logGroup of response.logGroups ?? []) {
      yield logGroup
    }
  } while (response.nextToken)
}

async function main() {
  const { Account } = await sts.getCallerIdentity({})

  for await (const { logGroupName } of getLogGroups()) {
    if (logGroupName?.match(/^\/aws\/lambda\/.*(dev|prod)$/)) {
      await cw.putSubscriptionFilter({
        logGroupName,
        filterName: 'ship-to-elastic',
        filterPattern: '',
        destinationArn: `arn:aws:lambda:eu-central-1:${Account}:function:${StackName}`,
      })
      console.log(`${logGroupName} is now shipping logs to elastic`)
    }
  }
}

main().catch(console.error)
