// ==========================================
// Benchmark: Array.find() vs Map.get()
// ==========================================
// This script demonstrates the performance difference between O(N) Array lookup
// and O(1) Map lookup (Hash tables).
// 
// Run this file independently using: node benchmarks.js

const ITEMS_COUNT = 100000;
const SEARCH_TARGET = 99999; // Worst case scenario for Array search (finding the very last item)

console.log(`Setting up data structures with ${ITEMS_COUNT} items...\n`);

// 1. Setup Array Data
const arrayData = [];
for (let i = 0; i < ITEMS_COUNT; i++) {
    arrayData.push({ id: `task-${i}`, val: `Demo value-${i}` });
}

// 2. Setup Map Data
const mapData = new Map();
for (let i = 0; i < ITEMS_COUNT; i++) {
    mapData.set(`task-${i}`, { id: `task-${i}`, val: `Demo value-${i}` });
}

console.log(`Searching for item ID 'task-${SEARCH_TARGET}'...`);
console.log('----------------------------------------------------');

// Benchmark Array (O(N) Time Complexity)
// The engine must iterate through elements sequentially until it finds a match.
console.time('Array O(N)');
const resultFromArray = arrayData.find(item => item.id === `task-${SEARCH_TARGET}`);
console.timeEnd('Array O(N)');

// Benchmark Map (O(1) Constant Time Complexity)
// The engine hashes the key and immediately knows the exact memory location.
console.time('Map O(1)');
const resultFromMap = mapData.get(`task-${SEARCH_TARGET}`);
console.timeEnd('Map O(1)');

console.log('----------------------------------------------------');
console.log('Notice how much faster the Map lookups are! As your data grows to millions');
console.log('of records in an enterprise app, O(1) Data Structures are non-negotiable.');
