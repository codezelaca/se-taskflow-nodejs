const crypto = require('crypto'); // Built-in Node.js module for unique IDs
const PriorityQueue = require('./PriorityQueue');
const DependencyList = require('./DependencyList');

// ==========================================
// TaskStore - In-Memory Data Store (Class)
// ==========================================
// We use a Class here to encapsulate our data and the methods that operate on it.
// This gives us a clean interface: taskStore.create(), taskStore.getAll(), etc.

class TaskStore {
    constructor() {
        // Concept: HashMaps & Big O Notation
        // 
        // 1. Why a Map instead of an Array?
        //    Arrays use O(N) time complexity for searching. As the array grows to 100,000 items,
        //    finding an item at the end of the array requires 100,000 operations.
        //    A JS Map is a Hash table, meaning it hashes the key to a memory address.
        //    This gives O(1) constant time lookups. No matter how many tasks we have,
        //    retrieving by ID takes the exact same amount of time.
        //
        // 2. Why a JS Map instead of a Plain Object ({})?
        //    - Maps are highly optimized by the JavaScript engine for frequent additions and removals.
        //    - Maps maintain insertion order natively (making getAll predictable).
        //    - They avoid prototype injection attacks (Object keys can clash with built-in properties like .toString)
        //    - Maps conveniently have a built-in .size property.
        
        this.tasks = new Map();
        this.queue = new PriorityQueue(); // O(log N) Task Queue prioritizing important tasks
    }

    // create(task): Adds a new task to the store.
    create(data) {
        // We use crypto.randomUUID() for a universal unique identifier to prevent collisions
        const id = crypto.randomUUID(); 
        
        // Initialize Linked List for task dependencies
        const taskDependencies = new DependencyList();
        if (Array.isArray(data.dependencies)) {
            data.dependencies.forEach(depId => taskDependencies.append(depId));
        }

        const task = {
            id,
            title: data.title || 'Untitled Task',
            description: data.description || '',
            status: data.status || 'pending', // could be 'pending', 'in-progress', 'completed'
            priority: data.priority !== undefined && data.priority !== null ? Number(data.priority) : 1, // Default Low (1), higher = critical
            dependencies: taskDependencies,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // O(1) Constant time insertion
        this.tasks.set(id, task);
        
        // O(log N) Priority Queue insertion
        this.queue.enqueue(task);
        
        return task;
    }

    // getById(id): Retrieves a task.
    getById(id) {
        // O(1) Constant time lookup using the Hash structure
        return this.tasks.get(id); // Returns the task object or undefined
    }

    // getAll(): Returns all values in the Map.
    getAll() {
        // values() returns an iterator. We spread it into an Array to serialize correctly to JSON.
        // This is an O(N) operation based on the number of tasks, but unavoidable when retrieving ALL data.
        return Array.from(this.tasks.values());
    }

    // update(id, changes): Merges new changes into an existing task.
    update(id, changes) {
        // Check if task exists in O(1) time
        if (!this.tasks.has(id)) return null;

        const existingTask = this.tasks.get(id);
        
        // SAFEGUARD: Intercept dependency list to ensure the Linked List object isn't overwritten
        if (changes.dependencies && Array.isArray(changes.dependencies)) {
            existingTask.dependencies.clear();
            changes.dependencies.forEach(depId => existingTask.dependencies.append(depId));
            
            // Delete it from the 'changes' object so the spread operator below perfectly skips over it
            delete changes.dependencies;
        }

        // Spread operator to merge the old task data and and new changes together
        const updatedTask = {
            ...existingTask,
            ...changes,
            id, // We force the 'id' so the client cannot accidentally overwrite it
            updatedAt: new Date().toISOString()
        };

        // Ensure priority is properly cast as a number if updated
        if (updatedTask.priority !== undefined && updatedTask.priority !== null) {
            updatedTask.priority = Number(updatedTask.priority);
        }
        
        // Re-set the updated reference in the Map
        this.tasks.set(id, updatedTask);
        
        // Re-balance the Queue (since object reference and priority might have changed)
        this.queue.remove(id);
        this.queue.enqueue(updatedTask);

        return updatedTask;
    }

    // delete(id): Removes a task from the store. 
    delete(id) {
        // Map.delete() is an O(1) operation.
        const existed = this.tasks.delete(id);
        
        if (existed) {
            // Also remove from Priority Queue O(N) finding + O(log N) removal
            this.queue.remove(id);
            
            // O(N) Cascade Execution: Sweep through all tasks to remove this deleted ID
            // from their internal dependency linked lists to prevent ghost links.
            for (const task of this.tasks.values()) {
                task.dependencies.remove(id);
            }
        }
        
        return existed;
    }

    // getNextTask(): Pops and returns the highest priority task
    getNextTask() {
        const task = this.queue.dequeue();
        if (task) {
            // Remove it from the Map since it's dequeued
            this.tasks.delete(task.id);
        }
        return task;
    }
}

// Concept: The Singleton Pattern
// Instead of exporting the class itself: `module.exports = TaskStore;`
// We export an instantiated, single instance of the class:
module.exports = new TaskStore();

// Explanation for the class:
// Node.js module caching system means that the first time `require('./TaskStore')` is called,
// this file is executed and the new TaskStore memory reference is cached.
// Every subsequent file that requires TaskStore will get the EXACT SAME object instance in memory.
// This acts as a global, shared memory state without using global variables.
