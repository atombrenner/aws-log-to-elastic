# aws-log-to-elastic

Send CloudWatch LogGroups to Elastic

## Motivation

Kibana and ElasticSearch are powerful tools to analyze structured logs.
You can easily subscribe to AWS Log Groups to get notified of data
written to log streams. This data needs to be parsed and send to elastic.
But ElasticSearch nowadays is huge and offers lots of features.
Also you need to be aware of some pitfalls to capture all log data
and not silently ignore special errors, e.g. Lamba Invocation errors.
This repo captures my experience with setups for high-volume logging
and parsing structured json logs mixed with unstructured logs.
It is best for node applications using running on AWS lambda.

## Index setup

We want to search case insensitive. We need to customize the analyzer to
index only lowercase values. We want to specify if a field is a
text field (full-text search) or a keyword or number. Keywords and
numbers allow aggregating, e.g. count how many logs have the level warning.
Changing the type of a field afterward is not possible.
We configure field types and analyzers in [elastic/template.yml](elastic/template.yml).
We create one index per day. Daily indices enable Elastics
index lifecycle management. We configure the lifetime of an index
in the [elastic/lifecycle](elastice/lifecycle.yml) file.

## Lambda Logs

Having a specialized log forwarder that knows about AWS Lambda enables
advanced possibilities. AWS Lambda modifies the console to write log levels
and other custom information. We can parse them and attach this information
automatically to logs. We can also see lambda invoke errors (e.g. unhandled exceptions)
and parse with nice stack traces.

## Watcher

Because the configuration of a [watch in json](https://www.elastic.co/guide/en/elasticsearch/reference/current/watcher-api-put-watch.html)
is quite cumbersome, there is also the possibility to configure watches with
a simplified yaml file in [elastic/watches.yml](elastic/watches.yml).
Only [integration with slack](https://www.elastic.co/guide/en/elasticsearch/reference/8.0/actions-slack.html#configuring-slack)
is implemented. It should be easy to change this
to other notification targets supported by Elasticsearch. The name of the slack
integration in Elasticsearch must be configured in `SLACK` environment variable.

## Tools

The environment variable `ELASTIC_URL` takes the authenticated elastic.

- `npm run update` apply the index, lifecycle and watcher configuration
- `npm run stack` create or update the CloudFormation stack (the log forwarding lambda function)
- `npm run deploy` build and deploy the lambda function
- `npm run subscribe PATTERN` subscribe all log groups matching the PATTERN
- `npm run unsubscribe` unsubscribes all log groups
