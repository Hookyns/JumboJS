"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Url");
}
class Url {
    constructor(request) {
        this.options = {};
        this.options = {
            action: request.action,
            controller: request.controller,
            subApp: request.subApp,
            location: request.location.locationName,
            locale: request.locale,
            params: {}
        };
    }
    action(action, controller, params) {
        this.options.action = action;
        if (controller)
            this.options.controller = controller;
        if (params)
            this.options.params = params;
        return this;
    }
    controller(controller) {
        this.options.controller = controller;
        return this;
    }
    subApp(subApp) {
        this.options.subApp = subApp;
        return this;
    }
    params(params) {
        this.options.params = params;
        return this;
    }
    locale(locale) {
        this.options.locale = locale;
        return this;
    }
    location(location) {
        this.options.location = location;
        return this;
    }
    getUrl() {
        const opt = this.options;
        if (this.options.location) {
            return Locator_1.Locator.instance.generateLocationUrl(opt.location, opt.controller, opt.action, opt.params, opt.subApp, opt.locale);
        }
        else {
            return Locator_1.Locator.instance.generateUrl(opt.controller, opt.action, opt.params, opt.subApp, opt.locale);
        }
    }
}
exports.Url = Url;
const Locator_1 = require("jumbo-core/application//Locator");
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Url END");
}
//# sourceMappingURL=Url.js.map