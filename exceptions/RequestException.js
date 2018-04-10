"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Exception_1 = require("./Exception");
class RequestException extends Exception_1.Exception {
    constructor(message, statusCode = 404, buildStack = false, redirectTo = null) {
        super(message);
        this.statusCode = statusCode;
        this.redirectTo = redirectTo;
    }
}
exports.RequestException = RequestException;
//# sourceMappingURL=RequestException.js.map