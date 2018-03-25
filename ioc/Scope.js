"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Scope");
}
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
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Scope END");
}
//# sourceMappingURL=Scope.js.map