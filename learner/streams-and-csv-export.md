# Streams and CSV Export

## Goal

Export large task datasets efficiently without loading everything into memory at once.

## Why Streams

Without streams:

- build huge CSV string in memory
- memory spikes with large datasets

With streams:

- produce output chunk by chunk
- keep memory profile stable
- improve responsiveness for large responses

## Planned Taskflow Feature

Endpoint idea:

- GET /tasks/export.csv

Behavior:

- set Content-Type text/csv
- set Content-Disposition for file download
- stream header row then each task row

## Streaming Pipeline Concept

1. source emits task records
2. transform converts records to CSV lines
3. response writable stream sends bytes to client

## Reliability Concerns

- sanitize commas/quotes/newlines in CSV cells
- handle client disconnects cleanly
- propagate stream errors to centralized handler

## Exercise

Build a simple Readable from task list and pipe through Transform that serializes CSV rows.

Measure memory usage before and after under large synthetic dataset.
