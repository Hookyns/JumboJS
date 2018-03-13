"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Locator_1 = require("jumbo-core/application//Locator");
const locator = Locator_1.Locator.instance;
class Url {
    constructor(request) {
        this.options = {};
        this.options = {
            action: request.action,
            controller: request.controller,
            subApp: request.subApp,
            location: request.location.locationName,
            lang: request.language,
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
    language(language) {
        this.options.lang = language;
        return this;
    }
    location(location) {
        this.options.location = location;
        return this;
    }
    getUrl() {
        const opt = this.options;
        if (this.options.location) {
            return locator.generateLocationUrl(opt.location, opt.controller, opt.action, opt.params, opt.subApp, opt.lang);
        }
        else {
            return locator.generateUrl(opt.controller, opt.action, opt.params, opt.subApp, opt.lang);
        }
    }
}
exports.Url = Url;
//# sourceMappingURL=Url.js.map