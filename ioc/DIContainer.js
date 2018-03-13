"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ControllerFactory_1 = require("../Application/ControllerFactory");
const Log_1 = require("../logging/Log");
const uuid = require("uuid/v1");
const LifetimeScope = {
    SingleInstance: "singleinstance",
    ScopeInstance: "scopeinstance",
    InstancePerResolve: "instanceperresolve"
};
let instance = null;
class DIContainer {
    constructor() {
        this.registeredTypes = {};
        if (new.target != DIContainerActivator) {
            throw new Error("You cannot call private constructor!");
        }
    }
    static get LifetimeScope() {
        return LifetimeScope;
    }
    static get instance() {
        if (instance === null) {
            instance = Reflect.construct(DIContainer, [], DIContainerActivator);
        }
        return instance;
    }
    register(expr, as, scope = LifetimeScope.InstancePerResolve) {
        this.registeredTypes[as] = {
            expr: expr,
            isExpr: !expr.prototype,
            params: null,
            scope: scope,
            instance: null
        };
    }
    resolveArguments(regType, _scope = null) {
        if (!regType.params) {
            let type = regType.isExpr ? regType.expr() : regType.expr;
            regType.params = ControllerFactory_1.ControllerFactory.instance.getConstructorParameters(type.prototype.constructor);
        }
        if (regType.params && regType.params.length == 0) {
            return [];
        }
        let args = [];
        for (let param of regType.params) {
            if (this.registeredTypes[param]) {
                if (_scope != null) {
                    args.push(_scope.resolve(param));
                }
                else {
                    args.push(this.resolve(param));
                }
            }
            else {
                args.push(null);
            }
        }
        return args;
    }
    resolve(name, _scope = null) {
        if (!this.registeredTypes[name]) {
            throw new Error(`No type under name '${name}' is registered in DI Container.`);
        }
        let regType = this.registeredTypes[name];
        if (regType.scope == DIContainer.LifetimeScope.SingleInstance && regType.instance) {
            return regType.instance;
        }
        if (_scope != null && regType.scope == LifetimeScope.ScopeInstance && _scope.instances[name]) {
            return _scope.instances[name];
        }
        let type = regType.isExpr ? regType.expr() : regType.expr;
        if (typeof type != "function") {
            return type;
        }
        try {
            let args = this.resolveArguments(regType, _scope);
            let instance;
            if (args.length == 0) {
                instance = new type();
            }
            else {
                instance = Reflect.construct(type, args);
            }
            if (_scope != null) {
                instance.__diContainerScope = _scope;
            }
            if (regType.scope === DIContainer.LifetimeScope.SingleInstance) {
                regType.instance = instance;
            }
            else if (_scope !== null && regType.scope === DIContainer.LifetimeScope.ScopeInstance) {
                _scope.instances[name] = instance;
            }
            return instance;
        }
        catch (e) {
            Log_1.Log.warning(e.message);
        }
        return null;
    }
    resolveUnregistered(type, _scope = null) {
        let name = type.__diContainerUid;
        if (!name) {
            name = type.__diContainerUid = uuid();
            if (!this.registeredTypes[name]) {
                this.register(type, name, DIContainer.LifetimeScope.InstancePerResolve);
            }
        }
        return this.resolve(name, _scope);
    }
}
exports.DIContainer = DIContainer;
class DIContainerActivator extends DIContainer {
}
//# sourceMappingURL=DIContainer.js.map