# aws-logstreams-to-elastic

Send CloudWatch Log Streams to Elastic

## Motivation

Kibana and ElasticSearch are powerful tools to analyze structured logs.
You can easily subscribe to AWS Logstreams to forward your logs to elastic.
But ElasticSearch nowadays is huge and offers lots of features.
This repo captures my experience with setups for high-volume logging.
It is best for node applications using structured logging running on AWS lambda.

## Index setup

We want to search case insensitive. We need to customize the analyzer to
index only lowercase values. We want to specify if a field is a
text field (full-text search) or a keyword or number. Keywords and
numbers allow aggregating, e.g. count how many logs have the level warning.
Changing the type of a field afterward is not possible.
We configure field types and analyzers in the (index-template)[index-template.yml].
We create one index per day. Daily indices enable Elastics
index lifecycle management. We configure the lifetime of an index
in the (index-policy)[index-policy.yml] file.

## Lambda Logs

Having a specialized log forwarder that knows about AWS Lambda enables
advanced possibilities. AWS Lambda modifies the console to write log levels
and other custom information. We can parse them and attach this information
automatically to logs. We can also see lambda invoke errors (e.g. unhandled exceptions)
and parse with nice stack traces.

## Tools

The environment variable `ELASTIC_URL` takes the authenticated elastic.

- `npm run update` apply the index configuration
- `npm run stack` create or update the CloudFormation stack (the log forwarding lambda function)
- `npm run deploy` build and deploy the lambda function
