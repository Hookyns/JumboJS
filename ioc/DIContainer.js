"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: DIContainer");
}
const LifetimeScope = {
    SingleInstance: "singleinstance",
    ScopeInstance: "scopeinstance",
    InstancePerResolve: "instanceperresolve"
};
const istanceKey = Symbol.for("Jumbo.IoC.DIContainer");
let instance = global[istanceKey] || null;
let controllerFactory = null;
class DIContainer {
    constructor() {
        this.registeredTypes = {};
        this.propertyInjectionTypes = {};
        if (new.target != DIContainerActivator) {
            throw new Error("You cannot call private constructor!");
        }
    }
    static get LifetimeScope() {
        return LifetimeScope;
    }
    static get instance() {
        if (instance == null) {
            global[istanceKey] = instance = Reflect.construct(DIContainer, [], DIContainerActivator);
            setImmediate(() => {
                controllerFactory = Jumbo.Application.ControllerFactory.instance;
            });
        }
        return instance;
    }
    register(expr, as, scope = LifetimeScope.InstancePerResolve) {
        if (!expr) {
            throw new Error(`Argument value is invalid. Parameter name: ${nameof({ expr })}`);
        }
        this.registeredTypes[as] = {
            expr: expr,
            isExpr: !expr.prototype,
            params: null,
            scope: scope,
            instance: null,
            injectablePropertie: null
        };
    }
    resolveArguments(regType, _scope = null) {
        if (!regType.params) {
            let type = regType.isExpr ? regType.expr() : regType.expr;
            regType.params = controllerFactory.getConstructorParameters(type.prototype.constructor);
        }
        if (regType.params.length === 0) {
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
    resolveInjectableProperties(type, regType, instance) {
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
            if (regType.injectablePropertie !== false) {
                this.resolveInjectableProperties(type, regType, instance);
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
            name = type.__diContainerUid = Symbol(type.name || undefined);
            if (!this.registeredTypes[name]) {
                this.register(type, name, DIContainer.LifetimeScope.InstancePerResolve);
            }
        }
        return this.resolve(name, _scope);
    }
    registerPropertyInjection(target, property, serviceName) {
        let symbol = target.__diContainerInjectablePropertyUid;
        if (!symbol) {
            symbol = target.__diContainerInjectablePropertyUid = Symbol(target.name || undefined);
        }
        let info = this.propertyInjectionTypes[symbol] || (this.propertyInjectionTypes[symbol] = {});
        info[property] = serviceName;
    }
}
exports.DIContainer = DIContainer;
class DIContainerActivator extends DIContainer {
}
const Log_1 = require("../logging/Log");
global.inject = function (serviceName) {
    return function (target, property) {
        DIContainer.instance.registerPropertyInjection(target, property, serviceName);
    };
};
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: DIContainer END");
}
//# sourceMappingURL=DIContainer.js.map