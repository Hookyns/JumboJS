"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Exception {
    constructor(message, withStack = false) {
        this.message = message;
        if (withStack) {
            Error.captureStackTrace(this);
        }
    }
}
exports.Exception = Exception;
//# sourceMappingURL=Exception.js.map