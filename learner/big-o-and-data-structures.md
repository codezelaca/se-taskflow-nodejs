# Big O and Core Data Structures

## Goal

Use complexity analysis to justify engineering decisions.

## Time and Space Complexity

- Time complexity: growth of operation steps as input size grows
- Space complexity: growth of extra memory as input size grows

Big O focuses on growth trend, not exact microseconds.

## Structures Used or Planned in Taskflow

- Array: ordered list, great iteration, slower lookup by ID
- Linked List: efficient local re-linking for dependency chains
- Hash Map (Map): fast key-based access
- Queue/Priority Queue: scheduling and processing order control

## Why This Is Practical

Performance problems are often design problems. The right structure can remove entire classes of bottlenecks.

## Existing Benchmark

See [../benchmarks.js](../benchmarks.js).

It compares:

- Array.find (O(N))
- Map.get (average O(1))

For large N, lookup behavior diverges sharply.

## Complexity Cheat Sheet

- Array push: amortized O(1)
- Array find: O(N)
- Map get/set/delete: average O(1)
- Linked list traversal: O(N)
- Priority queue insert/remove: usually O(log N) with heap implementation

## Exercise

Extend benchmark script to include:

- Object property lookup
- varying N values (1e3, 1e5, 1e6)

Then chart trend progression and discuss inflection points.
