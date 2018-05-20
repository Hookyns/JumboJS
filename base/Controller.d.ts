import { ErrorResult } from "../results/ErrorResult";
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
    protected renderView(viewOrData: any, data?: any): ViewResult;
    protected partialView(partialViewOrData?: any, data?: any): ViewResult;
    protected template(view?: any): ViewResult;
    protected view(viewOrData: any, data?: any): ViewResult;
    protected snippetView(viewOrData: any, dataOrSnippetName?: any, snippetName?: string): ViewResult;
    data(data: any, type?: string): void;
    json(jsonObj: any): void;
    protected error(message: any, statusCode?: number, error?: any): ErrorResult;
    protected fileDownload(filePath: any, newName: any, contentType: any): void;
    protected redirect(url: Url): void;
}
import { Url } from "jumbo-core/utils/Url";
import { Request } from "jumbo-core/application/Request";
import { Response } from "jumbo-core/application/Response";
import { Scope } from "jumbo-core/ioc/Scope";
import { ViewResult } from "jumbo-core/results/ViewResult";
