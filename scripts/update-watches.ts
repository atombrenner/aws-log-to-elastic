// Usage: npm run update:watches

import YAML from 'yamljs'
import { putJson, postJson, deleteJson } from '../lib/elastic'

const slack = process.env.SLACK ?? '' // the name of the slack account as configure in elastic, see https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-slack.html#configuring-slack

async function updateWatches(watches: any[]) {
  for (const watch of watches) {
    await updateWatch(watch)
  }
}

async function updateWatch(watch: any) {
  const aggAccessor = makeAggAccessor(watch.agg)
  const indices = watch.indices || 'daily-logs-*'

  const body = {
    metadata: {
      name: watch.id,
    },
    trigger: {
      schedule: { interval: watch.interval },
    },
    input: {
      search: {
        request: {
          search_type: 'query_then_fetch',
          indices: [indices],
          types: [],
          body: {
            size: 0,
            track_total_hits: true, // force elastic to count exactly and not stop at 10000
            query: makeQuery(watch),
            aggs: makeAgg(watch.agg),
          },
        },
      },
    },
    transform: {
      script:
        `return ['HITS': ctx.payload.hits.total` + (watch.agg ? `, 'AGG': ${aggAccessor}]` : ']'),
    },
    condition: {
      script: `return ${watch.condition}`
        .replace(/\$AGG/g, aggAccessor)
        .replace(/\$HITS/g, 'ctx.payload.hits.total'),
    },
    actions: {
      'notify-slack': {
        throttle_period: watch.throttle,
        slack: {
          message: {
            to: [slack], // Note: Each channel must be configured in elasticsearch.yml
            text: watch.message
              .replace(/\$HITS/g, '{{ctx.payload.HITS}}')
              .replace(/\$AGG/g, '{{ctx.payload.AGG}}'),
          },
        },
      },
    },
  }

  console.log(`Updating watch '${slack}-${watch.id}'`)
  await putJson(`/_xpack/watcher/watch/${slack}-${watch.id}`, body)
}

function makeQuery(watch: any) {
  return {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: `now-${watch.last}` } } },
        { query_string: { query: watch.query } },
      ],
    },
  }
}

function makeAggAccessor(agg: any) {
  if (!agg) return ''
  if (agg.type === 'percentile_rank' || agg.type === 'percentile')
    return 'Math.round(ctx.payload.aggregations.agg.values[0].value)'
  return 'Math.round(ctx.payload.aggregations.agg.value)'
}

function makeAgg(agg: any) {
  function innerAgg(agg: any) {
    const source = makeSource(agg.source)
    if (agg.type === 'percentile_rank')
      return { percentile_ranks: { keyed: false, values: [agg.value], ...source } }
    if (agg.type === 'percentile')
      return { percentiles: { keyed: false, percents: [agg.value], ...source } }
    if (agg.type === 'max') return { max: { ...source } }
    if (agg.type === 'min') return { min: { ...source } }
    if (agg.type === 'avg') return { avg: { ...source } }

    throw Error(`Unsupported aggregation ${agg}`)
  }

  return agg ? { agg: innerAgg(agg) } : {}
}

function makeSource(source: string) {
  source = source.trim()
  return source.match(/^[a-z]\w*$/i)
    ? { field: source }
    : { script: source.replace(/[a-z]\w*/gi, (match) => `doc.${match}.value`) }
}

async function removeOrphanedWatches(watches: any[]) {
  const data = await postJson('/_watcher/_query/watches', { size: 1000 })

  const active = new Set(watches.map((watch) => `${slack}-${watch.id}`))
  const orphaned = data.watches
    .map((h: any) => h._id)
    .filter((id: string) => !active.has(id) && id.startsWith(slack))

  for (const id of orphaned) {
    console.log(`Deleting watch ${id}`)
    await deleteJson(`/_xpack/watcher/watch/${id}`)
  }
}

async function main() {
  const watches = YAML.load('./elastic/watches.yml') || []
  if (watches.length === 0 && !slack) return
  if (!slack) throw Error('SLACK is undefined')

  await updateWatches(watches)
  await removeOrphanedWatches(watches)
}

main()
  .then(() => console.log('Update Watches Done'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
