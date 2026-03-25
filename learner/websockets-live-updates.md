# WebSockets for Live Task Updates

## Goal

Enable real-time updates so connected clients receive task changes immediately without refresh.

## Why WebSockets

HTTP is request-response. Real-time collaboration needs server push.

WebSockets provide a persistent duplex connection where server and clients can both send messages anytime.

## Project Constraint

Taskflow allows one external package for this stage:

- ws

This is intentionally introduced at the final stage to contrast:

- hand-built fundamentals first
- targeted dependency use when justified

## Planned Taskflow Behavior

On task create/update/delete:

- server broadcasts event payload to all connected clients

Example event shape:

- type: task.created | task.updated | task.deleted
- payload: task object or task id
- timestamp: ISO datetime

## Reliability Practices

- heartbeat/ping to detect dead clients
- remove disconnected sockets from client set
- validate inbound messages from clients
- avoid broadcasting sensitive internal fields

## Exercise

Implement broadcast for create/update/delete operations and build a tiny HTML client that prints live events to screen.

Stretch goal:

- subscribe clients by project/team room
- only broadcast relevant updates to each room
