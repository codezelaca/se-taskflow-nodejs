# Step 9: Streaming

## What You'll Learn

How to send large amounts of data without consuming huge amounts of memory.

## Big Picture

Imagine downloading a 1GB file.

**✗ Bad approach:**

```javascript
const data = fs.readFileSync("1gb-file.csv"); // Load entire file into memory!
res.end(data); // Send all at once
```

Your server uses 1GB of RAM just for one download. Multiple users = crash.

**✓ Good approach (Streaming):**

```javascript
fs.createReadStream("1gb-file.csv").pipe(res);
```

Reads 64KB at a time, sends it immediately, repeats.
Total memory used: constant, ~64KB.

## What To Build

A system that:

- Reads data in chunks
- Sends chunks as they're read
- Handles backpressure (when client is slow)
- Exports CSV and NDJSON formats without loading everything into memory

## Code Location

See **[server.js](../server.js)** lines for:

- `GET /tasks/export.csv` — streams tasks as CSV
- `GET /tasks/stream.ndjson` — streams tasks as NDJSON

## How Streaming Works

### Without Streams (naive)

```
Time 0: Read entire 1GB file
Time 30: File loaded in memory (1GB)
Time 31: Send all to client
```

### With Streams

```
Time 0-1: Read 64KB, send 64KB
Time 1-2: Read 64KB, send 64KB
Time 2-3: Read 64KB, send 64KB
...
Time 30-31: Read final 64KB, send it
```

Memory: **constant 64KB**, not 1GB!

## Stream Types

### Readable Stream

```javascript
const readable = fs.createReadStream("file.txt");
readable.on("data", (chunk) => {
  console.log("Received chunk:", chunk);
});
readable.on("end", () => {
  console.log("No more data");
});
```

### Writable Stream

```javascript
const writable = fs.createWriteStream("output.txt");
writable.write("Hello ");
writable.write("World\n");
writable.end(); // Close stream
```

### Transform Stream

```javascript
const { Transform } = require("stream");
const uppercase = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  },
});

fs.createReadStream("input.txt")
  .pipe(uppercase)
  .pipe(fs.createWriteStream("output.txt"));
```

Converts data as it flows through.

## Piping: The Easy Way

Instead of manually managing chunks:

```javascript
// ✗ Manual (verbose, error-prone)
readable.on("data", (chunk) => {
  writable.write(chunk);
});
readable.on("end", () => {
  writable.end();
});

// ✓ Pipe (simple, handles everything)
readable.pipe(writable);
```

Pipe automatically:

- Listens to data events
- Writes chunks to destination
- Handles backpressure
- Cleans up on end/error

## Backpressure: When Client Is Slow

```
Server sending fast     Client receiving slow
    ║                          ║
    ║════ 64KB chunk 1 ═════❯  Fast
    ║════ 64KB chunk 2 ═════❯  Buffering...
    ║════ 64KB chunk 3 ═════❯  Buffer full!
    ║════ 64KB chunk 4 ═════❯  STOP!
    ║
    Server should PAUSE sending here
```

Without backpressure handling:

```javascript
// ✗ Bad: sends as fast as server can
foreach (const chunk of data) {
  res.write(chunk);  // If client slow, memory builds up
}
```

With backpressure handling:

```javascript
// ✓ Good: respects client speed
foreach (const chunk of data) {
  if (!res.write(chunk)) {
    // Client's buffer is full, stop
    break;
  }
}
// When client catches up:
res.on('drain', () => {
  // Resume sending
});
```

Pipe handles this automatically!

## CSV Format

Comma-separated values, easy to import into Excel:

```
id,title,priority,status
1,Learn Node,5,pending
2,Build API,8,in-progress
3,Deploy,10,completed
```

Why use CSV?

- Excel/Google Sheets imports it directly
- Human-readable
- Simple parsing

Example generation:

```javascript
let csv = "id,title,priority,status\n";
for (const task of tasks.values()) {
  csv += `${task.id},${task.title},${task.priority},${task.status}\n`;
}
res.end(csv);
```

But for large datasets, streaming is better:

```javascript
const csv = createCsvTransform(); // Custom Transform stream
store.getAllAsStream().pipe(csv).pipe(res);
```

## NDJSON Format

Newline-delimited JSON, optimal for streaming:

```
{"id":"1","title":"Learn Node","priority":5}
{"id":"2","title":"Build API","priority":8}
{"id":"3","title":"Deploy","priority":10}
```

Why use NDJSON?

- Each line is complete JSON
- Can process line-by-line
- No need to wait for entire file
- Easy to parse incrementally

```javascript
// Client code
fetch('/tasks/stream.ndjson')
  .then(res => res.bodyUsed?)
  .then(async (reader) => {
    while (!reader.done) {
      const value = await reader.read();
      const lines = value.toString().split('\n');
      lines.forEach(line => {
        if (line) {
          const task = JSON.parse(line);
          display(task);  // Show immediately
        }
      });
    }
  });
```

Data appears immediately, not all at once.

## Your Turn: Try It

**Task 1:** Download tasks as CSV:

```bash
curl http://localhost:3000/tasks/export.csv \
  -H "Authorization: Bearer secret-user-123" \
  > tasks.csv

# Open tasks.csv in Excel or see:
cat tasks.csv
```

**Task 2:** Stream NDJSON:

```bash
curl http://localhost:3000/tasks/stream.ndjson \
  -H "Authorization: Bearer secret-user-123"
# Each line is one task JSON
```

**Task 3:** Create 1000 tasks and see memory impact:

```bash
bash scripts/full-demo.sh

# Check server memory usage in its logs
# With streaming, should stay constant
# Without streaming, would spike to 100MB+
```

## Real-World Connection

- **AWS S3:** Uploads large files with streams
- **Netflix:** Streams videos (HTTP progressive download)
- **Kafka/RabbitMQ:** Stream messages continuously
- **Hadoop:** Processes petabytes by streaming chunks
- **Log aggregation:** Tail logs with streams

Companies processing massive data rely on streaming.

## Next Step

Data is flowing efficiently. But what about **real-time updates** when something changes?

Next: **WebSockets** for live notifications.

[→ Step 10: WebSockets](10-websockets.md)
