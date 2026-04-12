# Step 4: Dependency Chains

## What You'll Learn

How to handle tasks that depend on other tasks—and detect when you have circular dependencies (impossible situations).

## Big Picture

Real work has prerequisites:

- Deploy can't run until tests pass
- Tests can't run until code is committed
- Code review must happen before commit

If you create a cycle (A depends on B, B depends on C, C depends on A), you're stuck forever.

This step teaches you to:

1. Track which tasks depend on other tasks
2. Find the correct order to execute everything
3. Detect and prevent impossible cycles

## What To Build

A system that:

- Stores dependency relationships (Task A depends on Task B)
- Finds execution order using **recursion** and **depth-first search**
- Detects cycles and reports them
- Uses a **Linked List** to store dependencies efficiently

## Code Location

See **[src/store/DependencyList.js](../src/store/DependencyList.js)** for the linked list.

See **[src/store/TaskStore.js](../src/store/TaskStore.js)** for the recursive resolver function `resolveExecutionOrder()`.

## Dependency Example

```
Task A (deploy)
  └─ depends on Task B

Task B (test)
  └─ depends on Task C

Task C (commit)
  └─ no dependencies
```

**Correct execution order:** C → B → A

## How Recursion Works

Think of a Russian nesting doll:

- Doll A hides Doll B
- Doll B hides Doll C
- Doll C is empty

To fully open Doll A, you must first open B, then C.

```javascript
function openDoll(doll) {
  if (doll.hasInner) {
    openDoll(doll.inner); // Recurse: open the inner doll first
  }
  console.log(`Opened ${doll.name}`); // Then open current doll
}
```

For tasks:

```javascript
function resolveOrder(taskId, visited = new Set()) {
  if (visited.has(taskId)) {
    throw new Error("Cycle detected!"); // Impossible situation
  }

  visited.add(taskId);
  const task = store.get(taskId);
  const order = [];

  // First, resolve all dependencies recursively
  for (const dep of task.dependencies) {
    order.push(...resolveOrder(dep, visited));
  }

  // Then add ourselves
  order.push(taskId);
  return order;
}
```

## Call Stack Visualization

When you call `resolveOrder('A')`:

```
resolveOrder('A')                    ← You are here
  ├─ resolveOrder('B')              ← Call resolved first
  │   ├─ resolveOrder('C')          ← Recurse deeper
  │   │   └─ return ['C']
  │   └─ return ['C', 'B']
  └─ return ['C', 'B', 'A']
```

The call stack grows until the deepest level, then collapses.

## Cycle Detection

What if you create impossible dependencies?

```
Task A → depends on → Task B
Task B → depends on → Task A
```

This is infinite:

- To run A, you need B first
- To run B, you need A first
- Never-ending!

Solution: Track **visited** nodes. If you encounter a node twice, cycle detected.

```javascript
visited = new Set();
resolveOrder("A", visited);
// A not in visited yet, add it
// Mark as visited: {'A'}
// Check A's dependencies: B
// Recurse: resolveOrder('B', visited)
//   B not visited yet, add it
//   Mark as visited: {'A', 'B'}
//   Check B's dependencies: A
//   Recurse: resolveOrder('A', visited)
//     A IS in visited! ✗ CYCLE!
```

## Linked List Storage

Dependencies are stored in a **Linked List**:

```javascript
class Node {
  constructor(taskId) {
    this.taskId = taskId;
    this.next = null; // Points to next dependency
  }
}

class DependencyList {
  constructor() {
    this.head = null; // Start of chain
  }

  add(taskId) {
    const node = new Node(taskId);
    if (!this.head) {
      this.head = node;
      return;
    }
    // Walk to end, then add
    let current = this.head;
    while (current.next) current = current.next;
    current.next = node;
  }
}
```

**Why Linked List?**

- Easy to add/remove at any position (no array resizes)
- Memory efficient for chains
- O(N) traversal, but chains are usually short

## Your Turn: Trace It

**Task:** Draw the execution order for this scenario:

```
API View (task 1) → depends on → Response Handler (task 2)
Response Handler (task 2) → depends on → Error Handler (task 3)
Error Handler (task 3) → no dependencies
```

What's the correct execution order?

**Bonus:** What if you add: Error Handler (3) → depends on → API View (1)?

Should be a cycle! ✗

## Error Codes

When you hit problems:

```bash
HTTP 409 Conflict     # Cycle detected—impossible to resolve
HTTP 422 Unprocessable Entity  # Missing dependency—can't find a task
HTTP 200 OK           # Success—here's the order
```

## Real-World Connection

- **Build systems:** Maven, Gradle use this to compile code (check dependencies before building)
- **Database migrations:** run migrations in dependency order
- **Package managers:** npm, pip use this to install packages in correct order
- **CI/CD pipelines:** GitHub Actions, Jenkins check dependencies

Understanding recursion and cycle detection makes you smarter about these tools.

## Next Step

You have tasks, priorities, and dependencies working. Now you need to **route requests safely through your server**.

That's where middleware comes in.

[→ Step 5: Middleware Chains](05-middleware.md)
