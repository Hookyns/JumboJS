"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Log_1 = require("jumbo-core/logging/Log");
const FUNC_PARAM_REGEX = /^[\s\S]*?\(([\s\S]*?)\)/;
const CTOR_PARAM_REGEX = /^[\s\S]*?constructor\s*\(([\s\S]*?)\)/;
exports.MAIN_SUBAPP_NAME = "_default";
let instance = null;
class ControllerFactory {
    constructor() {
        this.subApp = {};
        if (new.target != ControllerFactoryActivator) {
            throw new Error("You cannot call private constructor!");
        }
        this.loadControllersAndActions();
        this.clearRequireCache();
    }
    static get instance() {
        if (instance == null) {
            instance = Reflect.construct(ControllerFactory, [], ControllerFactoryActivator);
        }
        return instance;
    }
    getSubAppId(subApp) {
        return subApp.toLowerCase();
    }
    getControllerId(controller) {
        controller = controller.toLowerCase();
        if (controller.slice(-10) == "controller")
            return controller;
        return controller + "controller";
    }
    getActionId(action, method = "action") {
        method = method.toLowerCase();
        action = action.toLowerCase();
        if (action.slice(0, method.length) == method)
            return action;
        return method + action;
    }
    getSubAppName(subApp) {
        return this.getSubAppInfo(this.getSubAppId(subApp)).name;
    }
    getControllerName(controller, subAppId = exports.MAIN_SUBAPP_NAME) {
        return this.getControllerInfo(this.getControllerId(controller), subAppId).name;
    }
    getActionName(action, controllerId, subAppId = exports.MAIN_SUBAPP_NAME, method = "action") {
        return this.getActionInfo(this.getActionId(action, method), controllerId, subAppId).name;
    }
    createController(controllerId, subAppId, scope) {
        let ctrlInfo = this.getControllerInfo(controllerId, subAppId);
        let Controller = ctrlInfo.getClass();
        return scope.resolveUnregistered(Controller);
    }
    getSubAppInfo(subAppId) {
        let subAppInfo = this.subApp[subAppId];
        if (!subAppInfo)
            throw new Error(`Sub-app ${subAppId} was not found.`);
        return subAppInfo;
    }
    getControllerInfo(controllerId, subAppId) {
        let subAppInfo = this.getSubAppInfo(subAppId);
        let controllerInfo = subAppInfo.controllers[controllerId];
        if (!controllerInfo)
            throw new Error(`Controller ${controllerId} was not found in sub-app ${subAppId}`);
        return controllerInfo;
    }
    getActionInfo(actionId, controllerId, subAppId) {
        let controllerInfo = this.getControllerInfo(controllerId, subAppId);
        let actionInfo = controllerInfo.actions[actionId];
        if (!actionInfo)
            throw new Error(`Action ${actionId} was not found in controller ${controllerId} in sub-app ${subAppId}`);
        return actionInfo;
    }
    getTargetPoint(subApp, controller, action, method = undefined) {
        let controllerId = this.getControllerId(controller);
        let actionId = this.getActionId(action, method);
        let subId = subApp;
        if (subApp == Locator_1.Locator.instance.main) {
            subId = exports.MAIN_SUBAPP_NAME;
        }
        let sa = this.subApp[subId];
        if (!sa)
            throw new Error(`Subapp '${subApp}' doesn't exist.`);
        let ctrl = sa.controllers[controllerId];
        if (!ctrl)
            throw new Error(`Controller '${controller}' of sub-app '${subApp}' doesn't exist.`);
        let act = ctrl.actions[actionId] || ctrl.actions[this.getActionId(action)];
        if (!act && method == undefined) {
            act = this.findAction(ctrl.actions, actionId);
        }
        if (!act) {
            throw new Error(`Action '${actionId}' doesn't exists in controller '${controller}' of sub-app '${subApp}'.`);
        }
        return {
            subApp: sa.name,
            controller: ctrl.name,
            action: act.name
        };
    }
    getFunctionParameters(func) {
        return this.getParameters(func, FUNC_PARAM_REGEX);
    }
    getConstructorParameters(func) {
        return this.getParameters(func, CTOR_PARAM_REGEX);
    }
    findAction(actions, action) {
        action = action.toLowerCase();
        let actNames = Object.keys(actions);
        let actionVariant = [];
        for (let method of Locator_1.ActionTypes) {
            actionVariant.push(method + action);
        }
        let actionName = actNames.find(act => actionVariant.includes(act));
        if (actionName != undefined) {
            return actions[actionName];
        }
        return undefined;
    }
    getParameters(func, regex) {
        let matchArgs = func.toString().match(regex);
        let args = [];
        if (matchArgs) {
            args = matchArgs[1].replace(/\s/g, "").split(",");
            if (args.length == 1 && args[0] == "") {
                args = [];
            }
        }
        return args;
    }
    loadActionsFromController(ctrl) {
        let proto = ctrl.prototype;
        let actions = {};
        for (let actionName of Object.getOwnPropertyNames(proto)) {
            for (let actionType of Locator_1.ActionTypes) {
                if (actionName.substr(0, actionType.length) == actionType) {
                    let args = this.getFunctionParameters(proto[actionName]);
                    actions[actionName.toLowerCase()] = {
                        name: actionName,
                        params: args,
                        method: actionType == "action" ? null : actionType.toUpperCase()
                    };
                }
            }
        }
        return actions;
    }
    loadControllersFromNamespace(namespace, subAppId, appendTo = {}) {
        for (let controllerName of Object.getOwnPropertyNames(namespace)) {
            if (namespace[controllerName].constructor == Object) {
                this.loadControllersFromNamespace(namespace[controllerName], subAppId, appendTo);
                continue;
            }
            else if (namespace[controllerName].prototype == undefined) {
                Log_1.Log.error(`Controllers.${controllerName} doesn't export class.`);
                continue;
            }
            appendTo[controllerName.toLowerCase()] = {
                name: controllerName,
                params: this.getConstructorParameters(namespace[controllerName].prototype.constructor),
                getClass: () => namespace[this.subApp[subAppId].controllers[controllerName.toLowerCase()].name],
                actions: this.loadActionsFromController(namespace[controllerName])
            };
        }
        return appendTo;
    }
    camelToKebabCase(subApp) {
        return subApp.charAt(0).toLowerCase() + subApp.substr(1).replace(/[A-Z]/g, function (char) {
            return "-" + char.toLowerCase();
        });
    }
    loadControllersAndActions() {
        const AppNamespace = require("jumbo-core/autoloader/autoloader").App;
        if (Object.keys(AppNamespace.SubApps).length) {
            let subApps = Object.getOwnPropertyNames(AppNamespace.SubApps);
            let sc = subApps.length;
            let subAppName;
            for (let sp = 0; sp < sc; sp++) {
                subAppName = subApps[sp];
                this.subApp[subAppName.toLowerCase()] = {
                    name: subAppName,
                    dir: this.camelToKebabCase(subAppName),
                    controllers: this.loadControllersFromNamespace(AppNamespace.SubApps[subAppName].Controllers, subAppName.toLowerCase()),
                };
            }
        }
        this.subApp[exports.MAIN_SUBAPP_NAME] = {
            name: exports.MAIN_SUBAPP_NAME,
            dir: Jumbo.APP_DIR,
            controllers: this.loadControllersFromNamespace(AppNamespace.Controllers, exports.MAIN_SUBAPP_NAME)
        };
    }
    clearRequireCache() {
        for (let mod of Object.keys(require.cache)) {
            if (require.cache[mod].filename.slice(0, Jumbo.CORE_DIR.length).toLowerCase()
                != Jumbo.CORE_DIR.toLowerCase()) {
                delete require.cache[mod];
            }
        }
    }
}
exports.ControllerFactory = ControllerFactory;
class ControllerFactoryActivator extends ControllerFactory {
}
const Locator_1 = require("jumbo-core/application/Locator");
//# sourceMappingURL=ControllerFactory.js.map