# Part 02: In-Memory Task Store With Hash Map

## Goal

Learn how data structure choice affects API performance and system behavior.

## What You Build

- Task store class with CRUD methods
- Hash Map-based storage using JavaScript Map
- Singleton exported store shared across server imports

## Current Project Mapping

See [../src/store/TaskStore.js](../src/store/TaskStore.js).

Methods:

- create(data)
- getById(id)
- getAll()
- update(id, changes)
- delete(id)

## Why Map Instead of Array

ID lookup in an Array is linear search, which is O(N).

ID lookup in a Map is average O(1).

At large scale, O(1) lookup avoids major latency growth.

## Big O Snapshot

- create: O(1)
- getById: O(1)
- update: O(1)
- delete: O(1)
- getAll: O(N)

## Singleton Behavior in Node

TaskStore exports one instance.

Node caches module exports after first require call, so every importer receives the same in-memory reference.

Result:

- consistent shared process state
- state reset when process restarts

## Tradeoffs

Advantages:

- simple
- fast for learning and prototyping
- no external infrastructure needed

Limitations:

- no persistence across restarts
- no multi-process consistency
- not durable for production workloads

## Hands-On Exercise

Add a method:

- getByStatus(status): return tasks matching status

Then add endpoint:

- GET /tasks?status=pending

Constraint:

- keep complexity discussion explicit in your implementation notes

## Real-World Relevance

Most backend bottlenecks trace back to storage model mismatch with access patterns. Learning this early prevents costly rewrites later.
