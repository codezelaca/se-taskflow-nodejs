// ==========================================
// Node for our Linked List
// ==========================================
class Node {
    constructor(taskId) {
        this.taskId = taskId;
        this.next = null; // Pointer to the next dependency node
    }
}

// ==========================================
// DependencyList - Singly Linked List Implementation
// ==========================================
// Manages a sequential chain of task IDs that must be completed.
// We use a tail pointer to ensure O(1) insertions.

class DependencyList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // O(1) addition to the tail
    append(taskId) {
        const newNode = new Node(taskId);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    // O(N) removal by task ID
    remove(taskId) {
        if (!this.head) return false;

        // If the target is the head node
        if (this.head.taskId === taskId) {
            this.head = this.head.next;
            this.size--;
            if (this.size === 0) {
                this.tail = null;
            }
            return true;
        }

        // Traverse to find the gap
        let current = this.head;
        while (current.next) {
            if (current.next.taskId === taskId) {
                // Link past the target node
                current.next = current.next.next;
                this.size--;
                
                // If we severed the tail, re-assign tail
                if (current.next === null) {
                    this.tail = current;
                }
                return true;
            }
            current = current.next;
        }

        return false; // Not found
    }

    // Empties the list structure
    clear() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // O(N) traversal to convert back to an array
    toArray() {
        const result = [];
        let current = this.head;
        while (current) {
            result.push(current.taskId);
            current = current.next;
        }
        return result;
    }

    // Built-in JavaScript hook triggered during JSON.stringify().
    // By returning an Array, our nested Linked List nodes won't clutter the HTTP response!
    toJSON() {
        return this.toArray();
    }
}

module.exports = DependencyList;
