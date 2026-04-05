const BaseHandler = require('./BaseHandler');

class PermissionHandler extends BaseHandler {
    async handle(req, res, sendResponse) {
        const { method } = req;
        const { role } = req.user;

        // Admin can do everything. Users can only GET.
        if (role === 'user') {
            if (method !== 'GET') {
                sendResponse(403, { error: 'Forbidden: Insufficient role permissions for mutating actions' });
                return false; // Break the chain
            }
        }

        // Permission granted! Pass responsibility to the next handler.
        return super.handle(req, res, sendResponse);
    }
}

module.exports = PermissionHandler;
