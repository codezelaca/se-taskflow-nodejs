// ==========================================
// TaskFlow - Raw Node.js HTTP Server
// ==========================================

const http = require('http');

// Load simple .env parser logic
require('./src/config/env').loadEnv();

// Import our Singleton TaskStore. 
const taskStore = require('./src/store/TaskStore');

// Import Middleware Chain Components
const AuthHandler = require('./src/middleware/AuthHandler');
const PermissionHandler = require('./src/middleware/PermissionHandler');
const ValidationHandler = require('./src/middleware/ValidationHandler');

// Hook up the Chain block: Auth -> Permission -> Validation
const middlewareChain = new AuthHandler();
middlewareChain.setNext(new PermissionHandler()).setNext(new ValidationHandler());

const PORT = 3000;

// Helper function to extract JSON from an incoming stream (the request)
// This deals with asynchronous data chunks more elegantly.
const parseJSON = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                // Return an empty object if no body exists, otherwise parse it.
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
};

const server = http.createServer(async (req, res) => {
    
    // We can extract CORS headers if building a frontend later.
    // Setting up the base response header type.
    const sendResponse = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const { method, url } = req;

    // Parse incoming JSON body for mutating requests globally
    if (method === 'POST' || method === 'PUT') {
        try {
            req.body = await parseJSON(req);
        } catch (error) {
            return sendResponse(400, { error: 'Invalid JSON payload format.' });
        }
    }

    // We'll add rudimentary routing based on the start of the URL.
    if (url === '/tasks' || url.startsWith('/tasks/')) {
        
        // ==========================================
        // MIDDLEWARE CHAIN EXECUTION
        // ==========================================
        const chainPassed = await middlewareChain.handle(req, res, sendResponse);
        if (!chainPassed) {
            return; // A handler caught an issue, returned an HTTP error, and halted execution.
        }
        
        // Extract an ID if it exists in the URL (e.g., /tasks/fa21-b2c3 -> "fa21-b2c3")
        const id = url.split('/')[2]; 

        // ----------------------------------------------------
        // Handle GET /tasks (All) or /tasks/:id (Single, peek, queue)
        // ----------------------------------------------------
        if (method === 'GET') {
            if (id === 'queue') {
                // Returns the raw Max-Heap array
                sendResponse(200, taskStore.queue.heap);
            } else if (id === 'peek') {
                // Returns the highest priority task without deleting it
                sendResponse(200, taskStore.queue.peek() || { message: "Queue is empty" });
            } else if (id) {
                const task = taskStore.getById(id);
                if (task) {
                    sendResponse(200, task);
                } else {
                    sendResponse(404, { error: 'Task not found' });
                }
            } else {
                // URL was just /tasks
                sendResponse(200, taskStore.getAll());
            }
        } 
        
        // ----------------------------------------------------
        // Handle POST /tasks (Create)
        // ----------------------------------------------------
        else if (method === 'POST') {
            const newTask = taskStore.create(req.body);
            sendResponse(201, newTask);
        } 

        // ----------------------------------------------------
        // Handle PUT /tasks/:id (Update)
        // ----------------------------------------------------
        else if (method === 'PUT' && id) {
            const updatedTask = taskStore.update(id, req.body);
            
            if (updatedTask) {
                sendResponse(200, updatedTask);
            } else {
                sendResponse(404, { error: 'Task not found, update failed.' });
            }
        }

        // ----------------------------------------------------
        // Handle DELETE /tasks/:id (Delete)
        // ----------------------------------------------------
        else if (method === 'DELETE' && id) {
            // Memory efficient O(1) delete execution
            const success = taskStore.delete(id); 
            
            if (success) {
                // 204 No Content is standard for successful deletions where no body is returned.
                res.writeHead(204); 
                res.end();
            } else {
                sendResponse(404, { error: 'Task not found, deletion failed.' });
            }
        }

        // ----------------------------------------------------
        // Method Not Allowed
        // ----------------------------------------------------
        else {
            sendResponse(405, { error: 'Method Not Allowed on this endpoint.' });
        }

    } 
    // ----------------------------------------------------
    // Fallback URL router
    // ----------------------------------------------------
    else {
        sendResponse(404, { error: 'Route Not Found' });
    }
});

server.listen(PORT, () => {
    console.log(`TaskFlow server is running on http://localhost:${PORT}`);
    console.log(`Listening for requests... (Press Ctrl+C to stop)`);
});
