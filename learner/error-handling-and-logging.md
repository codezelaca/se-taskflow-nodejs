# Error Handling and Centralized Logging

## Goal

Make failures predictable, observable, and safe for clients.

## Problem With Scattered try/catch

If each route handles errors differently, clients receive inconsistent payloads and logs become hard to trace.

## Better Pattern

- standardized error object shape
- centralized responder
- request-level metadata in logs

## Suggested Error Shape

- code: stable machine-readable identifier
- message: human-readable summary
- details: optional structured context
- requestId: correlation identifier
- timestamp: event time

## Logging Fundamentals

Log levels:

- info: normal operations
- warn: recoverable problems
- error: request failure or exception

Always include:

- method
- route
- status code
- response time
- requestId

## Taskflow Progression

Current server has local error handling for JSON parsing and missing resources.

Planned upgrade:

- global error utility
- consistent error payload contract
- structured logs for debugging and incident analysis

## Exercise

Introduce a requestId per incoming request and include it in all responses and logs.
