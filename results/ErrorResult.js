"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: ErrorResult");
}
class ErrorResult {
    constructor(message, statusCode = 500, error = undefined) {
        this.message = message;
        this.statusCode = statusCode;
        this.error = error;
    }
}
exports.ErrorResult = ErrorResult;
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: ErrorResut END");
}
//# sourceMappingURL=ErrorResult.js.map