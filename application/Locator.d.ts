import * as $http from "http";
export declare const DEFAULT_CONTROLLER = "Home";
export declare const DEFAULT_ACTION = "index";
export declare let END_DELIMITER_TRIM_REGEX: RegExp;
export declare const ActionTypes: string[];
export declare class Locator {
    private locations;
    main: string;
    private subDomains;
    host: string | null;
    private delimiter;
    private delimiterEscaped;
    private urlAliases;
    static readonly ParamType: {
        Integer: RegExp;
        StringId: RegExp;
        Number: RegExp;
    };
    static readonly Method: {
        POST: string;
        PUT: string;
        GET: string;
        DELETE: string;
    };
    static readonly defaultController: string;
    static readonly defaultAction: string;
    static readonly instance: Locator;
    static readonly defaultLocationName: string;
    setHost(host: string): void;
    setDelimiter(delimiter: string): void;
    setMainSubdomain(subName: string): void;
    constructor();
    addSubdomain(subName: string): void;
    addLocation(locationName: string, location: string, options?: ILocationOptions | null, subApp?: string): void;
    addDefaultLocation(location: string): void;
    generateLocationUrl(locationName: any, controller?: any, action?: any, params?: {}, subApp?: string, lang?: any, protocol?: string, host?: string): string;
    requestLocaleOrDefault(request: $http.IncomingMessage): string;
    parseUrl(request: $http.IncomingMessage): ILocatorMatch;
    addUrlAlias(url: any, alias: any): void;
    getUrlForAlias(alias: any): string;
    private emptyLocationMatch(parse, subApp, request);
    private extractSubApp(request);
    private findLocationForUrl(url, subApp);
    private getSubAppFromRequest(request);
    private createLocationMatcher(location, loc, options);
    private prepareNewLocation(location, options, subApp);
}
