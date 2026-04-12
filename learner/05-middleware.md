# Step 5: Middleware Chains

## What You'll Learn

How to build a **pipeline** that checks requests before they reach your business logic.

## Big Picture

Every request needs certain checks:

1. Do you have a valid API token? (Authentication)
2. Can this user perform this action? (Authorization)
3. Is the data valid? (Validation)

Instead of repeating these checks in every endpoint, use a **middleware chain**.

```
Request
  ↓
Auth Handler   ✓ or ✗
  ↓
Permission Handler   ✓ or ✗
  ↓
Validation Handler   ✓ or ✗
  ↓
Business Logic (create task, etc.)
  ↓
Response
```

If any handler fails, stop immediately and return error.

## What To Build

A system where:

- Each handler checks one specific thing
- Handlers run in order
- Failed check = immediate error response
- Passing all checks = request continues forward

This is the **Chain of Responsibility** pattern.

## Code Location

See **[src/middleware/](../src/middleware/)** folder:

- `AuthHandler.js` — checks authentication token
- `PermissionHandler.js` — checks if user can perform action (Admin vs User)
- `ValidationHandler.js` — checks if data is valid

Look at how they call `next()` to pass control to the next handler.

## How It Works

### Handler Structure

```javascript
class AuthHandler {
  handle(req, res, next) {
    const token = req.headers["authorization"];

    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing token" }));
      return; // Stop here, don't call next()
    }

    req.user = verifyToken(token); // Attach user to request
    next(); // Pass to next handler
  }
}
```

### Running the Chain

```javascript
const handlers = [
  new AuthHandler(),
  new PermissionHandler(),
  new ValidationHandler()
];

function runMiddleware(req, res, handler Index = 0) {
  if (handlerIndex >= handlers.length) {
    // All checks passed, run business logic
    businessLogic(req, res);
    return;
  }

  const handler = handlers[handlerIndex];
  const next = () => runMiddleware(req, res, handlerIndex + 1);
  handler.handle(req, res, next);
}
```

**Flow:**

1. Call first handler, pass `next`
2. If handler calls `next()`, run second handler
3. If handler doesn't call `next()`, stop (error response already sent)
4. After all handlers pass, run business logic

## The Three Checks Explained

### 1. Authentication (AuthHandler)

**Question:** "Who are you?"

```bash
# With valid token:
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123"

# Without token:
curl http://localhost:3000/tasks
# Returns: 401 Unauthorized
```

Tokens are stored in your `.env` file.

### 2. Authorization (PermissionHandler)

**Question:** "Are you allowed to do this?"

Admin users (token `secret-admin-123`) can:

- Create tasks
- Update tasks
- Delete tasks

Regular users (token `secret-user-123`) can only:

- View tasks

```bash
# User trying to create task:
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-user-123" \
  -d '{"title":"test"}'
# Returns: 403 Forbidden
```

### 3. Validation (ValidationHandler)

**Question:** "Is your data valid?"

Checks:

- Required fields present (title, priority)
- Types are correct (priority is number, not string)
- Values make sense (priority between 1-10)

```bash
# Invalid priority:
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -d '{"title":"test","priority":"high"}'
# Returns: 422 Unprocessable Entity
```

## Why This Pattern?

**Without middleware:**

```javascript
function createTask(req, res) {
  // Check auth
  if (!req.headers.auth) {
    res.end("401");
    return;
  }

  // Check permission
  if (user.role !== "admin") {
    res.end("403");
    return;
  }

  // Check validation
  if (!req.body.title) {
    res.end("422");
    return;
  }

  // Finally: actual business logic
  const task = createTask(req.body);
  res.end(JSON.stringify(task));
}

function updateTask(req, res) {
  // Repeat all checks again...
}

function deleteTask(req, res) {
  // Repeat all checks again...
}
```

**With middleware:**

```javascript
// Each endpoint only has business logic
function createTask(req, res) {
  const task = store.create(req.body);
  res.writeHead(201);
  res.end(JSON.stringify(task));
}
```

Checks are done once, reused everywhere.

## Your Turn: Try It

**Task:** Add a new middleware handler that checks request body size.

```javascript
class SizeHandler {
  handle(req, res, next) {
    // Only allow requests under 1MB
    const sizeKB = /* calculate from req */;
    if (sizeKB > 1024) {
      res.writeHead(413);  // Payload Too Large
      res.end('{"error":"Request too large"}');
      return;
    }
    next();
  }
}
```

## Real-World Connection

Every real API uses middleware:

- **Express.js:** middleware functions
- **Django:** middleware classes
- **AWS Lambda:** middleware/interceptors
- **Kubernetes:** admission controllers (same pattern!)

Understanding this deeply helps you design secure, maintainable APIs.

## Next Step

You now have requests flowing safely through a middleware chain. But what happens when something goes wrong?

Next: **Error Handling & Logging**.

[→ Step 6: Error Handling](06-errors-logging.md)
