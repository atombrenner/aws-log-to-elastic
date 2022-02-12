import { CloudWatchLogs, DescribeLogGroupsCommandOutput } from '@aws-sdk/client-cloudwatch-logs'
import { makeThrottle } from '../lib/throttle'

const cw = new CloudWatchLogs({ maxAttempts: 6 })
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
  for await (const { logGroupName } of getLogGroups()) {
    await throttle()
    const response = await cw.describeSubscriptionFilters({ logGroupName })
    if (response) {
      for (const { filterName } of response.subscriptionFilters ?? []) {
        console.log(`Deleting subscription "${filterName}" for ${logGroupName}`)
        await throttle()
        await cw.deleteSubscriptionFilter({ logGroupName, filterName })
      }
    }
  }
}

main().catch(console.error)
