export declare class Scope {
    instances: {
        [name: string]: any;
    };
    resolve(name: any): any;
    resolveUnregistered(type: any): any;
}
