export declare class DIContainer {
    private registeredTypes;
    static readonly LifetimeScope: {
        SingleInstance: string;
        ScopeInstance: string;
        InstancePerResolve: string;
    };
    static readonly instance: DIContainer;
    constructor();
    register(expr: () => Function | Function | {}, as: string, scope?: string): void;
    private resolveArguments(regType, _scope?);
    resolve(name: string, _scope?: Scope): any;
    resolveUnregistered(type: () => Function | Function | {}, _scope?: Scope): any;
}
import { Scope } from "./Scope";
