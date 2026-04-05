const BaseHandler = require('./BaseHandler');

class AuthHandler extends BaseHandler {
    async handle(req, res, sendResponse) {
        // Look for the Authorization header
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            sendResponse(401, { error: 'Unauthorized: Missing Authorization header' });
            return false; // Break the chain
        }

        // Expected format: "Bearer <token>" or just "<token>"
        const token = authHeader.includes(' ') ? authHeader.split(' ')[1] : authHeader;
        
        // Identity matching based on our natively parsed .env file
        if (token === process.env.ADMIN_TOKEN) {
            req.user = { role: 'admin' };
        } else if (token === process.env.USER_TOKEN) {
            req.user = { role: 'user' };
        } else {
            sendResponse(401, { error: 'Unauthorized: Invalid token' });
            return false; // Break the chain
        }

        // Token is valid! Pass responsibility to the next handler in the chain.
        return super.handle(req, res, sendResponse);
    }
}

module.exports = AuthHandler;
