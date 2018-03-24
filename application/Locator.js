"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $qs = require("querystring");
const $url = require("url");
const $object = require("jumbo-core/utils/object");
const ControllerFactory_1 = require("jumbo-core/application/ControllerFactory");
const ParamType = {
    Integer: /[0-9]+/,
    StringId: /[a-zA-Z_]/,
    Number: /[0-9]*(?:\.[0-9]+)?/
};
const Method = {
    POST: "POST",
    PUT: "PUT",
    GET: "GET",
    DELETE: "DELETE"
};
exports.DEFAULT_LANGUAGE = Jumbo.config.globalization.defaultLanguage;
const GLOBALIZATION_ENABLED = Jumbo.config.globalization.enabled;
exports.DEFAULT_CONTROLLER = "Home";
exports.DEFAULT_ACTION = "index";
exports.END_DELIMITER_TRIM_REGEX = /[\/]+$/;
const LOCATION_PARAM_REGEX = /\$([a-z][a-zA-Z]*)/g;
const LOCATION_LANG_VARIABLE_NAME = "globlanguage";
const LOCATION_CTRL_VARIABLE_NAME = "controller";
const LOCATION_ACTION_VARIABLE_NAME = "action";
const DEFAULT_LOCATION_NAME = "default";
exports.ActionTypes = ["action"].concat(Object.getOwnPropertyNames(Method).map(m => m.toLowerCase()));
const IS_IP_REGEX = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
const PORT_REMOVE_REGEX = /:[0-9]+$/;
const SQUARE_BRACKET_REGEX = /[\[\]]/g;
const LOCATION_ALL_SLASHES_REGEX = /\//g;
let DELIMITER_REGEX = LOCATION_ALL_SLASHES_REGEX;
function locationParamReplacer(varName, lang, useLang, controller, action, params, location) {
    if (varName == LOCATION_LANG_VARIABLE_NAME) {
        if (!useLang)
            return "";
        return lang;
    }
    if (varName == LOCATION_CTRL_VARIABLE_NAME) {
        if (!controller) {
            throw new Error("This location require controller but you didn't pass any in parameters.");
        }
        return controller;
    }
    if (varName == LOCATION_ACTION_VARIABLE_NAME) {
        if (!action) {
            throw new Error("This location require action but you don't pass any in parameters.");
        }
        return action;
    }
    if (params[varName]) {
        let param = params[varName];
        delete params[varName];
        return param;
    }
    if (location.options[varName]) {
        return location.options[varName];
    }
    return "";
}
let instance = null;
class Locator {
    constructor() {
        this.locations = new Map();
        this.main = "www";
        this.subDomains = [];
        this.host = null;
        this.delimiter = "/";
        this.delimiterEscaped = "/";
        this.urlAliases = {};
        if (new.target != LocatorActivator) {
            throw new Error("You cannot call private constructor!");
        }
    }
    static get ParamType() {
        return ParamType;
    }
    static get Method() {
        return Method;
    }
    static get defaultController() {
        return exports.DEFAULT_CONTROLLER;
    }
    static get defaultAction() {
        return exports.DEFAULT_ACTION;
    }
    static get instance() {
        if (instance == null) {
            instance = Reflect.construct(Locator, [], LocatorActivator);
        }
        return instance;
    }
    setHost(host) {
        this.host = host;
    }
    setDelimiter(delimiter) {
        if (delimiter.length != 1) {
            throw new Error("Delimiter must be exactly one character.");
        }
        this.delimiter = delimiter;
        if (["\\", ".", "*", "?", "+", "|", "(", ")", "[", "]", "{", "}"].indexOf(delimiter) != 1) {
            this.delimiterEscaped = "\\" + delimiter;
        }
        exports.END_DELIMITER_TRIM_REGEX = new RegExp(this.delimiterEscaped + "+$");
        DELIMITER_REGEX = new RegExp(this.delimiterEscaped, "g");
    }
    setMainSubdomain(subName) {
        this.main = subName.toLowerCase();
    }
    addSubdomain(subName) {
        this.subDomains.push(subName.toLowerCase());
    }
    addLocation(locationName, location, options = {}, subApp = null) {
        if (typeof location != "string") {
            throw new Error("Locaton must be string.");
        }
        if (options !== null && options.constructor !== Object) {
            throw new Error("Options parameter must be Object.");
        }
        if (this.locations.has(locationName)) {
            throw new Error("Location with this name already exists.");
        }
        let loc = this.prepareNewLocation(location, options, subApp);
        loc.locationName = locationName;
        this.locations.set(locationName, loc);
    }
    addDefaultLocation(location) {
        if (typeof location != "string") {
            throw new Error("Locaton must be string.");
        }
        if (this.locations.has(DEFAULT_LOCATION_NAME)) {
            throw new Error("Default location already exists.");
        }
        let locationEntries = this.locations.entries();
        this.locations = new Map();
        let loc = this.prepareNewLocation(location, {}, null);
        loc.locationName = DEFAULT_LOCATION_NAME;
        this.locations.set(DEFAULT_LOCATION_NAME, loc);
        let key, item;
        for ([key, item] of locationEntries) {
            this.locations.set(key, item);
        }
    }
    generateUrl(controller, action, slashParams = [], queryParams = {}, subApp = null, lang = null, protocol = null, host = null) {
        ControllerFactory_1.ControllerFactory.instance.getTargetPoint(subApp, controller, action);
        let baseUrl = "/";
        if (host || protocol || subApp) {
            baseUrl = (protocol || "http") + "://" + (!!subApp ? (subApp + ".") : "") + (host || this.host) + "/";
        }
        if (lang && lang != exports.DEFAULT_LANGUAGE && GLOBALIZATION_ENABLED) {
            baseUrl += lang + this.delimiter;
        }
        let queryParamsLength = Object.keys(queryParams).length;
        let noParams = slashParams.length == 0 && queryParamsLength == 0;
        if (controller == exports.DEFAULT_CONTROLLER
            && action == exports.DEFAULT_ACTION && noParams) {
            return baseUrl;
        }
        else if (action == exports.DEFAULT_ACTION && noParams) {
            return baseUrl + controller.toLowerCase();
        }
        else {
            let url = baseUrl + controller.toLowerCase() + this.delimiter + action.toLowerCase();
            if (!noParams) {
                if (slashParams.length === 0)
                    url += this.delimiter;
                for (let i = 0; i < slashParams.length; i++) {
                    url += this.delimiter + slashParams[i];
                }
                if (queryParamsLength != 0) {
                    url += "&" + $qs.stringify(queryParams);
                }
            }
            return url;
        }
    }
    generateLocationUrl(locationName, controller = null, action = null, params = {}, subApp = null, lang = null, protocol = null, host = null) {
        let location = this.locations.get(locationName);
        if (!location) {
            throw new Error(`Location ${locationName} doesn't exists.`);
        }
        if (params.constructor !== Object) {
            throw new Error("Parameter 'params' must be Object");
        }
        if (location.options.controller) {
            controller = location.options.controller;
        }
        if (location.options.action) {
            action = location.options.action;
        }
        action = action.toLowerCase();
        controller = controller.toLowerCase();
        const useLang = GLOBALIZATION_ENABLED && lang && lang != exports.DEFAULT_LANGUAGE;
        lang = (lang || "").toLowerCase();
        let loc = location.location.replace(SQUARE_BRACKET_REGEX, "");
        const langInLoc = loc.indexOf("$" + LOCATION_LANG_VARIABLE_NAME) !== -1;
        let url = loc
            .replace(LOCATION_PARAM_REGEX, (_, varName) => locationParamReplacer(varName, lang, useLang, controller, action, params, location))
            .replace(LOCATION_ALL_SLASHES_REGEX, this.delimiter);
        if (url.charAt(url.length - 1) == this.delimiter) {
            url = url.slice(0, -1);
        }
        let baseUrl = "/";
        if (host || protocol || location.subApp) {
            baseUrl = (protocol || "http") + "://" + (!!subApp ? (subApp + ".") : "") + (host || this.host) + "/";
        }
        if (!langInLoc && useLang) {
            baseUrl += lang + this.delimiter;
        }
        if (Object.keys(params).length) {
            url += "?" + $qs.stringify(params);
        }
        return baseUrl + url;
    }
    parseUrl(request) {
        let url = request.url.replace(DELIMITER_REGEX, "/");
        let parse = $url.parse(url);
        url = parse.pathname.slice(1);
        let subApp = this.getSubAppFromRequest(request);
        let emptyLocation = this.emptyLocationMatch(parse, subApp);
        if (emptyLocation)
            return emptyLocation;
        let match;
        let location;
        [location, match] = this.findLocationForUrl(url, subApp);
        if (!location)
            return null;
        let matchedAction = match[location.actionIndex];
        let matchedController = match[location.controllerIndex];
        let res = {
            location: location,
            subApp: subApp,
            controller: location.targetedController
                ? location.controller
                : (matchedController || exports.DEFAULT_CONTROLLER),
            action: location.targetedAction
                ? location.action
                : (matchedAction || exports.DEFAULT_ACTION),
            params: $object.clone(location.params),
            language: GLOBALIZATION_ENABLED ? (match[1] || exports.DEFAULT_LANGUAGE) : exports.DEFAULT_LANGUAGE,
            actionInUrl: !!matchedAction,
            controllerInUrl: !!matchedController
        };
        let c = location.variables.length;
        for (let i = 0; i < c; i++) {
            let variable = location.variables[i];
            if (variable != LOCATION_CTRL_VARIABLE_NAME
                && variable != LOCATION_ACTION_VARIABLE_NAME
                && variable != LOCATION_LANG_VARIABLE_NAME) {
                res.params[variable] = match[i + 1];
            }
        }
        let queryParams = $qs.parse(parse.query);
        for (let qp in queryParams) {
            res.params[qp] = queryParams[qp];
        }
        return res;
    }
    addUrlAlias(url, alias) {
        this.urlAliases[alias] = url;
    }
    getUrlForAlias(alias) {
        return this.urlAliases[alias];
    }
    emptyLocationMatch(parse, subApp) {
        let emptyPath = parse.pathname == "/";
        if (emptyPath) {
            let lang = exports.DEFAULT_LANGUAGE;
            return {
                location: this.locations.get(DEFAULT_LOCATION_NAME),
                subApp: subApp,
                controller: exports.DEFAULT_CONTROLLER,
                action: exports.DEFAULT_ACTION,
                params: $qs.parse(parse.query),
                language: lang,
                actionInUrl: false,
                controllerInUrl: false
            };
        }
        return null;
    }
    extractSubApp(request) {
        let host = request.headers.host.replace(PORT_REMOVE_REGEX, "");
        if ((IS_IP_REGEX).test(host)) {
            return this.main;
        }
        let s = host.split(".");
        if (s.length < 3) {
            return this.main;
        }
        return (s[0] || this.main).toLowerCase();
    }
    findLocationForUrl(url, subApp) {
        let match;
        for (let [_, location] of this.locations) {
            match = url.match(location.locationMatcher);
            if (match !== null && ((subApp == null && location.subApp == this.main)
                || subApp == location.subApp
                || location.subApp === null)) {
                return [location, match];
            }
        }
        return [null, null];
    }
    getSubAppFromRequest(request) {
        let subApp = this.extractSubApp(request);
        if (subApp === this.main) {
            return subApp;
        }
        for (let sub of this.subDomains) {
            if (sub == subApp) {
                return subApp;
            }
        }
        throw new Error(`Subdomain '${subApp}' is not regitered!`);
    }
    createLocationMatcher(location, loc, options) {
        if (GLOBALIZATION_ENABLED && location.indexOf("$" + LOCATION_LANG_VARIABLE_NAME) === -1) {
            location = "[$" + LOCATION_LANG_VARIABLE_NAME + "[/]]" + location;
        }
        location = location
            .replace(/\[/g, "(?:")
            .replace(/]/g, ")?");
        loc.locationMatcher = new RegExp("^" + location.replace(LOCATION_PARAM_REGEX, (_, varName) => {
            loc.variables.push(varName);
            if (varName == LOCATION_LANG_VARIABLE_NAME) {
                return "([a-z]{2})";
            }
            if (varName == LOCATION_CTRL_VARIABLE_NAME) {
                return "([a-zA-Z]{3,})";
            }
            if (varName == LOCATION_ACTION_VARIABLE_NAME) {
                return "([a-zA-Z]{2,})";
            }
            varName = "$" + varName;
            if (options[varName]) {
                if (options[varName].constructor != RegExp) {
                    throw new Error(`Location parameter '$${varName}' must be regular expression.`);
                }
                return "(" + options[varName].toString().slice(1, -1) + ")";
            }
            return "([a-zA-Z0-9-_]+)";
        }) + "$");
        loc.actionIndex = loc.variables.indexOf(LOCATION_ACTION_VARIABLE_NAME) + 1;
        loc.controllerIndex = loc.variables.indexOf(LOCATION_CTRL_VARIABLE_NAME) + 1;
    }
    prepareNewLocation(location, options, subApp) {
        let loc = {
            locationName: "",
            location: location,
            locationMatcher: null,
            controller: null,
            action: null,
            params: options.params || {},
            targetedController: false,
            targetedAction: false,
            options: options,
            subApp: subApp,
            variables: [],
            controllerIndex: null,
            actionIndex: null
        };
        if (options.controller) {
            loc.controller = options.controller;
            loc.targetedController = true;
        }
        else {
            if (location.indexOf("$controller") === -1) {
                throw new Error("No controller specified in this location.");
            }
        }
        if (options.action) {
            loc.action = options.action;
            loc.targetedAction = true;
        }
        else {
            if (!location.match(/\$action/)) {
                throw new Error("No action specified in this location.");
            }
        }
        this.createLocationMatcher(location, loc, options);
        return loc;
    }
}
exports.Locator = Locator;
class LocatorActivator extends Locator {
}
//# sourceMappingURL=Locator.js.map