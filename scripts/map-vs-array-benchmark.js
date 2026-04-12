const ITEMS_COUNT = 100000;
const SEARCH_TARGET = 99999;

console.log(`Setting up data structures with ${ITEMS_COUNT} items...\n`);

const arrayData = [];
for (let i = 0; i < ITEMS_COUNT; i++) {
  arrayData.push({ id: `task-${i}`, val: `Demo value-${i}` });
}

const mapData = new Map();
for (let i = 0; i < ITEMS_COUNT; i++) {
  mapData.set(`task-${i}`, { id: `task-${i}`, val: `Demo value-${i}` });
}

console.log(`Searching for item ID 'task-${SEARCH_TARGET}'...`);
console.log("----------------------------------------------------");

console.time("Array O(N)");
arrayData.find((item) => item.id === `task-${SEARCH_TARGET}`);
console.timeEnd("Array O(N)");

console.time("Map O(1)");
mapData.get(`task-${SEARCH_TARGET}`);
console.timeEnd("Map O(1)");

console.log("----------------------------------------------------");
console.log("Map lookups stay stable as data grows.");
