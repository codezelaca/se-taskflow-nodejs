# Step 2: In-Memory Storage

## What You'll Learn

How to store and retrieve data fast using a **Hash Map**.

## Big Picture

Your server receives requests. You need to remember the data users send—tasks in this case. Where do you put it?

Option 1: Search through an Array every time → **slow** ❌  
Option 2: Use a Map for instant lookup → **fast** ✓

This step teaches you to build a simple data store.

## What To Build

A **TaskStore** that:

- Stores tasks in a JavaScript `Map`
- Creates a new task (add to Map)
- Retrieves a task by ID (lookup in Map)
- Updates a task (find and modify)
- Deletes a task (remove from Map)
- Lists all tasks

## Why Speed Matters

Imagine you have 100,000 tasks. You want task #99,999.

**Array lookup:**

```javascript
const all_tasks = [];
const find_task = all_tasks.find((t) => t.id === "99999");
// Checks task 1, task 2, task 3... task 99999. ~100,000 checks = O(N)
```

**Map lookup:**

```javascript
const store = new Map();
const find_task = store.get("99999");
// Direct access, instant = O(1)
```

At scale, Map is orders of magnitude faster.

## Code Location

See **[src/store/TaskStore.js](../src/store/TaskStore.js)**.

It exports a single instance that all parts of the server share. This is the **Singleton** pattern.

## How Singleton Works

When you `require` a module in Node.js, it runs once. The exports are cached.

```javascript
// Every require gets the SAME instance
const store = require("./TaskStore.js"); // First import: runs constructor
const store2 = require("./TaskStore.js"); // Second import: returns SAME instance, not new
```

So when server.js adds a task, and later route handler reads it—they're both using the SAME data store.

## Methods You'll Write

### create(taskData)

```javascript
create(taskData) {
  const id = crypto.randomUUID();
  const task = { id, ...taskData, createdAt: new Date().toISOString() };
  this.tasks.set(id, task);  // O(1) insertion
  return task;
}
```

- Generate unique ID
- Store in Map
- Return the new task

### getById(id)

```javascript
getById(id) {
  return this.tasks.get(id);  // O(1) lookup
}
```

- Direct lookup, instant

### getAll()

```javascript
getAll() {
  return Array.from(this.tasks.values());  // O(N) to convert, but only happens once
}
```

- Return array of all tasks
- This is O(N) because you must check all entries at least once

### update(id, changes)

```javascript
update(id, changes) {
  const task = this.tasks.get(id);  // O(1) lookup
  Object.assign(task, changes);     // Update fields
  return task;
}
```

- Find by ID
- Modify the existing object
- Return updated task

### delete(id)

```javascript
delete(id) {
  this.tasks.delete(id);  // O(1) deletion
}
```

- Remove from Map instantly

## Speed Comparison

| Operation | Array | Map  |
| --------- | ----- | ---- |
| Create    | O(1)  | O(1) |
| Get by ID | O(N)  | O(1) |
| Update    | O(N)  | O(1) |
| Delete    | O(N)  | O(1) |
| Get all   | O(N)  | O(N) |

**Takeaway:** Map is better for anything involving IDs.

## Important: Singleton Reset

In this project, all data lives in memory. When the server restarts:

- The Map is empty
- All tasks are lost

This is fine for learning. In production, you'd use a database to persist data.

## Your Turn: Try It

**Task:** Add a method to TaskStore:

```javascript
count() {
  return this.tasks.size;  // Return how many tasks exist
}
```

**Test it:**

```bash
curl http://localhost:3000/tasks/count
```

Should return something like:

```json
{ "count": 5 }
```

## Real-World Connection

Every database (PostgreSQL, MongoDB, Redis) uses similar structures internally:

- Hash maps for fast ID lookups
- Indices for quick search
- Caching layers to avoid re-fetching

Learning data structures now helps you understand database design later.

## Next Step

You can now store and retrieve tasks. But what if you have 1,000,000 tasks and only want the 10 most important ones?

That's where **Priority Queues** come in.

[→ Step 3: Priority Queues](03-priority-queue.md)
