"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DIContainer_1 = require("./DIContainer");
const diCotainer = DIContainer_1.DIContainer.instance;
class Scope {
    constructor() {
        this.instances = {};
    }
    resolve(name) {
        return diCotainer.resolve(name, this);
    }
    resolveUnregistered(type) {
        return diCotainer.resolveUnregistered(type, this);
    }
}
exports.Scope = Scope;
//# sourceMappingURL=Scope.js.map