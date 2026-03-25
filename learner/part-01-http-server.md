# Part 01: Raw Node.js HTTP Server

## Goal

Understand how to build an HTTP API without Express or any routing framework.

## What You Build

- A server using Node http.createServer
- Manual URL and method routing
- JSON responses with explicit status codes
- Request-body parsing for POST and PUT

## Why This Matters

Frameworks are excellent, but they hide mechanics. Knowing the baseline gives you:

- better debugging ability
- stronger performance intuition
- confidence when abstractions fail

## Current Project Mapping

See implementation in [../server.js](../server.js).

Key areas to inspect:

- server creation
- route matching (/tasks and /tasks/:id)
- parseJSON helper
- sendResponse helper

## How Request Parsing Works

Incoming HTTP body data arrives as stream chunks.

Server-side flow:

1. listen to data events
2. append chunks to a string
3. on end event, parse JSON
4. handle parse errors cleanly

This teaches why request parsing middleware exists in frameworks.

## Example Mental Model

Think of each request like a letter arriving in pieces:

- chunk 1: envelope fragment
- chunk 2: main letter
- chunk 3: signature

You only understand the message when all pieces arrive.

## Common Pitfalls

- assuming body arrives all at once
- not handling malformed JSON
- forgetting proper content-type response headers
- mixing route parsing logic with business logic

## Hands-On Exercise

Add a new endpoint:

- GET /health -> { status: "ok", uptime: number }

Rules:

- do not use external libraries
- return application/json
- keep route style consistent with existing server

## Real-World Relevance

Even with frameworks, production incidents often involve:

- malformed payload handling
- wrong status code semantics
- route collision edge cases

Raw-server knowledge shortens incident response time significantly.
