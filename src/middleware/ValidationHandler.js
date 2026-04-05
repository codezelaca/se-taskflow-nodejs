const BaseHandler = require('./BaseHandler');

class ValidationHandler extends BaseHandler {
    async handle(req, res, sendResponse) {
        const { method, body } = req;

        // Only validate creation/update payloads
        if (method === 'POST' || method === 'PUT') {
            if (body) {
                if (body.title !== undefined && typeof body.title !== 'string') {
                    sendResponse(400, { error: 'Validation Error: Title must be a string' });
                    return false;
                }
                if (body.priority !== undefined && isNaN(Number(body.priority))) {
                    sendResponse(400, { error: 'Validation Error: Priority must be a valid number' });
                    return false;
                }
                if (body.dependencies !== undefined && !Array.isArray(body.dependencies)) {
                    sendResponse(400, { error: 'Validation Error: Dependencies must be an array of string IDs' });
                    return false;
                }
            }
        }

        // Validation passed! Pass responsibility.
        return super.handle(req, res, sendResponse);
    }
}

module.exports = ValidationHandler;
