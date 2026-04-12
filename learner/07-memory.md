# Step 7: Memory Management

## What You'll Learn

How your program uses memory, why memory leaks happen, and how to prevent them.

## Big Picture

Every variable you create takes up computer memory:

```javascript
const name = "Alice"; // 10 bytes
const tasks = [1, 2, 3, 4, 5]; // 40 bytes
const user = { name: "Bob" }; // 50 bytes
```

When you stop using a variable, JavaScript's garbage collector frees that memory.

**But sometimes garbage collection fails:**

```javascript
const leakyArray = [];
setInterval(() => {
  leakyArray.push(new Array(1000000)); // Add 1MB every second
}, 1000);
// After 1 hour: 3.6GB consumed! 💥
```

This is a **memory leak**—memory you're not using, but can't get back.

## Stack vs Heap

Your program has two memory zones:

### Stack

- Stores primitive values (numbers, strings, booleans)
- Stores variable names
- Very fast access
- Fixed size, usually small (1MB)
- Automatically cleaned when function returns

```javascript
function doSomething() {
  const name = "Alice"; // Stack: 10 bytes
  const age = 25; // Stack: 8 bytes
  // When function returns, Stack is cleared
}
```

### Heap

- Stores objects, arrays, complex data
- Slower access than stack
- Large, can grow (up to available RAM)
- **Garbage collector cleans unused objects**

```javascript
function doSomething() {
  const user = { name: "Alice", age: 25 }; // Heap: 100 bytes
  // When function returns, variable is freed but object still on heap
  // Garbage collector will clean it up later
}
```

## How Garbage Collection Works

Imagine a memory warehouse:

```
Heap: {obj1} {obj2} {obj3} {obj4}
       ↑                    ↑
    used                  used
```

Objects are "used" if:

- A variable points to them
- Another object references them
- The execution path can reach them

Garbage collector marks unused objects and reclaims their space:

```
Heap (before GC): {obj1} {obj2} {obj3} {obj4} [used]
Heap (after GC):  {obj1}        {obj3}        [cleaned up!]
```

## Memory Leaks: The Problem

Accidentally keeping references to objects you don't need:

```javascript
// Bad: Event listeners that never clean up
element.addEventListener("click", () => {
  const hugeData = new Array(1000000);
  console.log("clicked");
});
// Every click adds another massive array to memory
// They're never freed because there's still a reference

// Good: Remove listeners when done
element.removeEventListener("click", handler);
```

## Common Leak Patterns

### 1. Forgotten Intervals/Timers

```javascript
// ✗ Bad
setInterval(() => {
  const data = fetchBigData();
  console.log(data);
}, 1000);
// Runs forever, accumulates data

// ✓ Good
const intervalId = setInterval(() => {
  const data = fetchBigData();
  console.log(data);
}, 1000);

// Later, when done:
clearInterval(intervalId);
```

### 2. Circular References

```javascript
// ✗ Bad
class Node {
  constructor() {
    this.data = new Array(1000);
    this.next = this; // Points to itself!
  }
}
// Some GCs struggle with self-references

// ✓ Good
class Node {
  constructor() {
    this.data = new Array(1000);
    this.next = null; // Clean reference
  }
}
```

### 3. Global Variables

```javascript
// ✗ Bad
globalData = new Array(1000000); // Lives until process ends

// ✓ Good
const localData = new Array(1000000);
// Cleaned up when scope ends
```

## Measuring Memory

```javascript
const memory = process.memoryUsage();
console.log({
  heapUsed: memory.heapUsed / 1024 / 1024, // MB
  heapTotal: memory.heapTotal / 1024 / 1024, // MB
  external: memory.external / 1024 / 1024,
  rss: memory.rss / 1024 / 1024, // Total system memory
});

// Output:
// {
//   heapUsed: 15.5 MB,
//   heapTotal: 32.0 MB,
//   external: 0.5 MB,
//   rss: 50.0 MB
// }
```

**What does it mean?**

- `heapUsed`: How much memory your program actually uses
- `heapTotal`: How much space is allocated for the heap
- `rss`: Total memory used by process (includes everything)

Watch `heapUsed` grow in a loop—it shouldn't climb forever.

## Your Turn: Demonstrate a Leak

**Task:** Create an intentional memory leak and observe it:

```javascript
const leakyArray = [];

for (let i = 0; i < 100000; i++) {
  leakyArray.push({
    data: new Array(1000), // 1KB per object
    timestamp: new Date(),
  });
}

console.log(process.memoryUsage());
// heapUsed will be ~100MB

// Now, if this array never gets cleaned up,
// memory stays at 100MB forever
```

**Fix it:**

```javascript
leakyArray.length = 0; // Clear the array
// or
delete leakyArray; // Remove reference

// Now garbage collection can reclaim the memory
```

## Real-World Connection

- **Node.js server:** Memory leak = server gradually uses more RAM until crash
- **Phone apps:** Leak = app gets slower over time
- **Browsers:** Leak = tab consumes more RAM each refresh
- **Enterprise systems:** Leak = service crashes after days/weeks

Memory issues are hard to debug because they're gradual. Prevention is easier than fixing.

## Next Step

You now understand memory. But what if you have **CPU-intensive work** blocking your server?

Next: **Worker Threads** to run heavy code in parallel.

[→ Step 8: Worker Threads](08-worker-threads.md)
