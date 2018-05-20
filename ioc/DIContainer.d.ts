export declare class DIContainer {
    private registeredTypes;
    private propertyInjectionTypes;
    static readonly LifetimeScope: {
        SingleInstance: string;
        ScopeInstance: string;
        InstancePerResolve: string;
    };
    static readonly instance: DIContainer;
    constructor();
    register(expr: () => Function | Function | {}, as: string, scope?: string): void;
    private resolveArguments(regType, _scope?);
    private resolveInjectableProperties(type, regType, instance);
    resolve(name: string, _scope?: Scope): any;
    resolveUnregistered(type: () => Function | Function | {}, _scope?: Scope): any;
    registerPropertyInjection(target: Function, property: string | Symbol, serviceName: string): void;
}
import { Scope } from "./Scope";
