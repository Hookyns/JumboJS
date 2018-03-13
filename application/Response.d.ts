import * as $http from "http";
export declare class Response {
    response: $http.ServerResponse;
    headers: {
        [headerProp: string]: any;
    };
    constructor(response: $http.ServerResponse);
    setCookie(name: string, value: string, expire: number, domain: string, path: string): void;
    unsetCookie(name: string): void;
    redirectUrl(url: string, code?: number): void;
}
