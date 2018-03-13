import * as $http from "http";
export declare class Request {
    private cookies;
    request: $http.IncomingMessage;
    subApp: string;
    location: ILocation;
    controller: string;
    controllerFullName: string;
    action: string;
    actionFullName: string;
    params: {
        [key: string]: any;
    };
    body: IBody;
    noCache: boolean;
    sessionId: string;
    language: string;
    beginTime: number;
    method: string;
    constructor(request: $http.IncomingMessage);
    isXhr(): boolean;
    getCookies(): {
        [key: string]: any;
    };
    getCookie(name: any): any;
    getIP(): string;
    _bindLocation(location: ILocation, subApp: FullSubAppNameString, controller: FullControllerNameString, action: FullActionNameString, params: any): void;
}
