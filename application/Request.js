"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Request");
}
const Application_1 = require("jumbo-core/application/Application");
const UPPER_CASE_CHAR_REGEX = /[A-Z]/;
class Request {
    constructor(request) {
        this.params = null;
        this.body = {};
        this.noCache = false;
        this.request = request;
        this.noCache = request.headers["pragma"] === "no-cache";
        this.method = request.method;
    }
    isXhr() {
        let x = this.request.headers["x-requested-with"];
        return x && x.toLowerCase() == "xmlhttprequest";
    }
    getCookies() {
        if (!this.cookies && this.request.headers.cookie) {
            this.cookies = {};
            this.request.headers.cookie.split(";").forEach((param) => {
                this.cookies[param.substr(0, param.indexOf("=")).trim()] = param.substr(param.indexOf("=") + 1);
            });
        }
        return this.cookies;
    }
    getCookie(name) {
        let cookies = this.getCookies();
        return cookies ? cookies[name] : null;
    }
    getIP() {
        return Application_1.Application.instance.getClientIP(this.request);
    }
    _bindLocation(location, subApp, controller, action, params) {
        this.subApp = subApp;
        this.controller = controller.slice(0, -10);
        const actionFirstLet = action.search(UPPER_CASE_CHAR_REGEX);
        this.action = action.charAt(actionFirstLet).toLowerCase() + action.slice(actionFirstLet + 1);
        this.params = params;
        this.actionFullName = action;
        this.controllerFullName = controller;
        this.location = location;
    }
}
exports.Request = Request;
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Request END");
}
//# sourceMappingURL=Request.js.map