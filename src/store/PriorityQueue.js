// ==========================================
// PriorityQueue - Max-Heap Implementation
// ==========================================
// A Max-Heap ensures that the element with the highest priority value 
// (e.g. 3 = Critical) is always at the root (index 0). 
// Insertions and removals are O(log N) compared to O(N) array sorting.

class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    // Helper functions to get parent/child indices based on binary tree array representation
    getParentIndex(i) { return Math.floor((i - 1) / 2); }
    getLeftChildIndex(i) { return 2 * i + 1; }
    getRightChildIndex(i) { return 2 * i + 2; }

    swap(i1, i2) {
        const temp = this.heap[i1];
        this.heap[i1] = this.heap[i2];
        this.heap[i2] = temp;
    }

    // O(log N) insertion
    enqueue(task) {
        this.heap.push(task);
        this.bubbleUp();
    }

    // Moves a newly added element up the tree to its correct position
    bubbleUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            let parentIndex = this.getParentIndex(index);
            // Max-Heap: if current node's priority is greater than parent's, swap them
            if (this.heap[index].priority > this.heap[parentIndex].priority) {
                this.swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    // O(log N) extraction
    dequeue() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const max = this.heap[0];
        // Move the last element to the root and sink down to restore heap property
        this.heap[0] = this.heap.pop();
        this.sinkDown(0);
        
        return max;
    }

    // Moves an element down the tree to its correct position
    sinkDown(index) {
        let maxIndex = index;
        const length = this.heap.length;

        while (true) {
            let leftIndex = this.getLeftChildIndex(index);
            let rightIndex = this.getRightChildIndex(index);

            // Check if left child exists and is greater than current max
            if (leftIndex < length && this.heap[leftIndex].priority > this.heap[maxIndex].priority) {
                maxIndex = leftIndex;
            }
            
            // Check if right child exists and is greater than current max
            if (rightIndex < length && this.heap[rightIndex].priority > this.heap[maxIndex].priority) {
                maxIndex = rightIndex;
            }

            if (maxIndex !== index) {
                this.swap(index, maxIndex);
                index = maxIndex;
            } else {
                break;
            }
        }
    }

    // O(1) read top element
    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    // O(N) finding + O(log N) removal
    remove(id) {
        const index = this.heap.findIndex(task => task.id === id);
        if (index === -1) return false;

        // If it's the last element, we can safely pop it without structural changes
        if (index === this.heap.length - 1) {
            this.heap.pop();
            return true;
        }

        // Overwrite the removed element with the very last element
        this.heap[index] = this.heap.pop();
        
        // The newly placed element might need to bubble up or sink down based on its value
        let parentIndex = this.getParentIndex(index);
        
        if (index > 0 && this.heap[index].priority > this.heap[parentIndex].priority) {
            // New value is larger than its parent, so it needs to bubble up
            let curr = index;
            while (curr > 0) {
                let pIdx = this.getParentIndex(curr);
                if (this.heap[curr].priority > this.heap[pIdx].priority) {
                    this.swap(curr, pIdx);
                    curr = pIdx;
                } else {
                    break;
                }
            }
        } else {
            // Need to sink down
            this.sinkDown(index);
        }
        
        return true;
    }
}

module.exports = PriorityQueue;
