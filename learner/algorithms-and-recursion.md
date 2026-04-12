# Algorithms: Searching, Sorting, Recursion

## Goal

Connect algorithm concepts directly to task-system behavior.

## Searching

Task lookup by ID:

- Map.get is preferred for direct key access
- Array scan is acceptable only for tiny datasets or one-off operations

## Sorting

Common real-life sort needs in task systems:

- by createdAt (timeline)
- by priority (execution order)
- by dependency depth

Sorting complexity for comparison-based sorts is typically O(N log N).

## Recursion in Dependency Resolution

When task A depends on B, and B depends on C, recursive traversal naturally fits graph-like relationships.

Basic recursive pattern:

1. process current node
2. recurse into dependencies
3. return resolved order

Current implementation mapping:

- Recursive DFS resolver in [../src/store/TaskStore.js](../src/store/TaskStore.js) via `resolveExecutionOrder(...)`
- Full-graph endpoint: `GET /tasks/resolve`
- Scoped endpoint: `GET /tasks/:id/resolve`
- Cycle conflict response: HTTP 409 with cycle path details
- Missing dependency response: HTTP 422 with missing node details
- Demo script: `scripts/dependency-resolver-demo.sh`

## Safety Notes

- guard against cycles (A -> B -> A)
- maintain visited set
- establish max-depth safety in hostile or malformed inputs

## Practical Exercise

Design a resolver that returns execution order for dependent tasks.

Requirements:

- detect cycles
- return informative error on cycle
- output topologically valid sequence

You can now run this in the project:

```bash
bash scripts/dependency-resolver-demo.sh
```

This becomes a strong bridge from data structures to production reliability.
