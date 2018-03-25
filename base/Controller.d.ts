export declare class Controller {
    request: Request;
    response: Response;
    session: {
        [key: string]: any;
    };
    scope: Scope;
    exited: boolean;
    crossRequestData: any;
    static clientMessagesId: string;
    protected readonly url: Url;
    _initController(request: Request, response: Response, session: {
        [key: string]: any;
    }, scope: Scope): void;
    _clearOldCrossRequestData(): void;
    protected static createBaseViewResult(viewOrData: string | {}, data: {}): ViewResult;
    exit(): void;
    addMessage(message: string, messageType: any): void;
    renderView(viewOrData: any, data?: any): ViewResult;
    partialView(partialViewOrData?: any, data?: any): ViewResult;
    template(view?: any): ViewResult;
    view(viewOrData: any, data?: any): ViewResult;
    snippetView(viewOrData: any, dataOrSnippetName?: any, snippetName?: string): ViewResult;
    data(data: any, type?: string): void;
    json(jsonObj: any): void;
    error(message: any, statusCode?: number, error?: any): {
        status: number;
        message: any;
        error: any;
    };
    fileDownload(filePath: any, newName: any, contentType: any): void;
    protected redirect(url: Url): void;
}
import { Url } from "jumbo-core/utils/Url";
import { Request } from "jumbo-core/application/Request";
import { Response } from "jumbo-core/application/Response";
import { Scope } from "jumbo-core/ioc/Scope";
import { ViewResult } from "jumbo-core/results/ViewResult";
