// Base class teaching the OOP Chain of Responsibility Pattern
class BaseHandler {
    constructor() {
        this.nextHandler = null;
    }

    setNext(handler) {
        this.nextHandler = handler;
        // Returning the handler allows us to seamlessly chain declarations: h1.setNext(h2).setNext(h3)
        return handler; 
    }

    // Default handle method: just runs the next handler if it exists.
    async handle(req, res, sendResponse) {
        if (this.nextHandler) {
            return await this.nextHandler.handle(req, res, sendResponse);
        }
        return true; // End of chain reached successfully
    }
}

module.exports = BaseHandler;
