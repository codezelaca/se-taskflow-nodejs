// ==========================================
// TaskFlow - Raw Node.js HTTP Server
// ==========================================

const http = require('http');

// Import our Singleton TaskStore. 
// Any updates through the POST endpoint mutate the state stored in this single instance.
const taskStore = require('./src/store/TaskStore');

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

    // We'll add rudimentary routing based on the start of the URL.
    if (url === '/tasks' || url.startsWith('/tasks/')) {
        
        // Extract an ID if it exists in the URL (e.g., /tasks/fa21-b2c3 -> "fa21-b2c3")
        const id = url.split('/')[2]; 

        // ----------------------------------------------------
        // Handle GET /tasks (All) or /tasks/:id (Single)
        // ----------------------------------------------------
        if (method === 'GET') {
            if (id) {
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
            try {
                const body = await parseJSON(req);
                const newTask = taskStore.create(body);
                sendResponse(201, newTask);
            } catch (error) {
                sendResponse(400, { error: 'Invalid JSON payload format.' });
            }
        } 

        // ----------------------------------------------------
        // Handle PUT /tasks/:id (Update)
        // ----------------------------------------------------
        else if (method === 'PUT' && id) {
            try {
                const body = await parseJSON(req);
                const updatedTask = taskStore.update(id, body);
                
                if (updatedTask) {
                    sendResponse(200, updatedTask);
                } else {
                    sendResponse(404, { error: 'Task not found, update failed.' });
                }
            } catch (error) {
                sendResponse(400, { error: 'Invalid JSON payload format.' });
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
