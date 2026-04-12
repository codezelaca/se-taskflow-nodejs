# Step 3: Priority Queues

## What You'll Learn

How to organize tasks by importance so you always process the most urgent ones first.

## Big Picture

You now have 1,000 tasks. Which should you work on next?

**Real example:** Apple support tickets

- Ticket A: Account locked (critical)
- Ticket B: Spelling error in email (minor)

You should process Ticket A first, even if it arrived second.

That's what a **Priority Queue** does.

## What To Build

A data structure that:

- Stores tasks with a "priority" number
- Always gives you the **highest priority** task instantly
- Adds/removes tasks efficiently
- Uses a **Heap** under the hood (a special tree structure)

## Code Location

See **[src/store/PriorityQueue.js](../src/store/PriorityQueue.js)**.

It's a Max-Heap, which means higher numbers float to the top.

## How a Heap Works

Imagine organizing books on a shelf where the **most urgent book is always in the front** and easy to grab.

Heap properties:

- Parent node ≥ all children (Max-Heap)
- Stored in an array for efficiency
- Shape is always balanced (no long branches)

```
       [10]          ← highest priority, root at index 0
      /    \
    [8]    [9]       ← children
   /  \
 [3] [5]            ← grandchildren
```

In array form: `[10, 8, 9, 3, 5]`

## Two Key Operations

### 1. Insert (enqueue)

1. Add to end of array
2. Bubble up while priority is higher than parent
3. Stop when in correct position

Cost: **O(log N)** operations, not O(N)

Example:

```
Start: [10, 8, 9]
Add 11: [10, 8, 9, 11]     ← add at end
Bubble: [10, 8, 11, 9]     ← 11 > 9, swap
Bubble: [11, 8, 10, 9]     ← 11 > 10, swap
Final: [11, 8, 10, 9]      ← 11 at top
```

### 2. Remove (dequeue)

1. Take the root (highest priority)
2. Move last item to root
3. Bubble down until in correct position

Cost: **O(log N)** operations

Example:

```
Start: [11, 8, 10, 9]
Take 11: [8, 10, 9]        ← remove root
Result: [9, 8, 10]         ← 9 bubbles down, 10 floats up
Final: [10, 8, 9]          ← 10 back on top
```

## Why Heap, Not Sorted Array?

| Operation  | Sorted Array | Heap                |
| ---------- | ------------ | ------------------- |
| Insert     | O(N) slow    | O(log N) fast       |
| Remove top | O(1) fast    | O(log N) acceptable |
| Get top    | O(1) fast    | O(1) fast           |

For frequent insertions/removals, Heap wins.

## Real-World Uses

- **OS task scheduler:** execute high-priority processes first
- **Networking:** process urgent packets before routine ones
- **Dijkstra's algorithm:** find shortest path by exploring closest nodes first
- **Huffman coding:** compress data by processing frequent bytes first

## Your Turn: Try It

**Task:** Look at the PriorityQueue code and trace through an example:

1. What's the parent of node at index 5?
2. What's the left child of node at index 2?
3. If you insert task with priority 100 into [50, 40, 30], where does it end up?

**Hints:**

- Parent index: `(i - 1) / 2`
- Left child: `2 * i + 1`
- Right child: `2 * i + 2`

## Real-World Connection

When you hire a team:

- You can't process every task (stack overflow)
- You process the most urgent first (priority queue)
- You use minimal resources (heap is memory-efficient)

Job schedulers in every OS work this way.

## Next Step

Now you're organizing tasks by priority. But some tasks depend on others—you can't process the deployment until the tests pass.

Next, you'll learn about **dependencies between tasks**.

[→ Step 4: Dependency Chains](04-dependencies.md)
