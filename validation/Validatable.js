"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Validatable {
    constructor() {
        if (!("validate" in this.constructor.prototype)) {
            throw new Error(`Validatable.validate() not implemented in '${this.constructor.name}'.`);
        }
    }
}
exports.Validatable = Validatable;
//# sourceMappingURL=Validatable.js.map