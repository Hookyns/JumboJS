export declare class Url {
    private options;
    constructor(request: Request);
    action(action: string, controller?: string, params?: any): Url;
    controller(controller: string): Url;
    subApp(subApp: string): Url;
    params(params: any): Url;
    language(language: any): Url;
    location(location: string): Url;
    getUrl(): string;
}
import { Request } from "jumbo-core/application/Request";
