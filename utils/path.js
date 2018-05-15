"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $os = require("os");
const $path = require("path");
const IS_WIN32 = $os.platform() === "win32";
function dirname(targetModule) {
    let path = $path.dirname(targetModule.filename);
    if (IS_WIN32) {
        path = path.charAt(0).toUpperCase() + path.slice(1);
    }
    return path;
}
exports.dirname = dirname;
//# sourceMappingURL=path.js.map