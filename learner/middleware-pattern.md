# Middleware Pattern (Chain of Responsibility)

## Goal

Build production-grade request pipelines without framework helpers.

## Pattern Overview

Middleware is a sequence of focused handlers. Each handler can:

- allow request to continue
- modify request context
- stop request with an error response

## Planned Taskflow Middleware Chain

1. Authentication middleware
2. Permission/role middleware
3. Validation middleware
4. Route handler

## Why Chain of Responsibility Works Well

- separation of concerns
- reusable logic across routes
- easier testing by layer

## Manual Middleware Runner Idea

Pseudo-flow:

1. keep array of middleware functions
2. execute middleware[index]
3. pass next function to move forward
4. handle thrown errors centrally

## Design Rules

- middleware should do one job
- return early on failure
- keep shared context explicit
- do not hide side effects

## Exercise

Implement middleware for POST /tasks:

- require fake token header (for learning)
- validate title type and max length
- reject invalid status values

Return structured error JSON consistently.
