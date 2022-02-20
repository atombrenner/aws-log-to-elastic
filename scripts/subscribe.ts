import { STS } from '@aws-sdk/client-sts'
import { CloudWatchLogs, DescribeLogGroupsCommandOutput } from '@aws-sdk/client-cloudwatch-logs'
import { makeThrottle } from '../lib/throttle'

const StackName = process.env.STACK_NAME
const cw = new CloudWatchLogs({ maxAttempts: 6 })
const sts = new STS({})
const throttle = makeThrottle(5)

async function* getLogGroups() {
  let response: DescribeLogGroupsCommandOutput | undefined
  do {
    await throttle()
    response = await cw.describeLogGroups({ nextToken: response?.nextToken, limit: 50 })
    for (const logGroup of response.logGroups ?? []) {
      yield logGroup
    }
  } while (response.nextToken)
}

async function main() {
  const { Account } = await sts.getCallerIdentity({})
  const pattern = new RegExp(process.argv[2] || '^/aws/lambda/', 'i')
  console.log(`Subscribing pattern ${pattern}`)

  for await (const { logGroupName } of getLogGroups()) {
    if (logGroupName === `/aws/lambda/${StackName}`) continue // never subscribe to own logs
    if (logGroupName?.match(pattern)) {
      await throttle()
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
