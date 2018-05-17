import { ErrorResult } from "../results/ErrorResult";
export declare class Controller {
    public request: Request;
    public response: Response;
    public session: {
        [key: string]: any;
    };
    public scope: Scope;
    public exited: boolean;
    public crossRequestData: any;
    public static clientMessagesId: string;
    protected readonly url: Url;

    public _initController(request: Request, response: Response, session: {
        [key: string]: any;
    }, scope: Scope): void;
    public _clearOldCrossRequestData(): void;

    protected static createBaseViewResult(viewOrData: string | {}, data: {}): ViewResult;
    protected exit(): void;
    
    protected addMessage(message: string, messageType: any): void;
    protected renderView(viewOrData: any, data?: any): ViewResult;
    protected partialView(partialViewOrData?: any, data?: any): ViewResult;
    protected template(view?: any): ViewResult;
    protected view(viewOrData: any, data?: any): ViewResult;
    protected snippetView(viewOrData: any, dataOrSnippetName?: any, snippetName?: string): ViewResult;
    protected data(data: any, type?: string): void;
    protected json(jsonObj: any): void;
    protected error(message: any, statusCode?: number, error?: any): ErrorResult;
    protected fileDownload(filePath: any, newName: any, contentType: any): void;
    protected redirect(url: Url): void;
}
import { Url } from "jumbo-core/utils/Url";
import { Request } from "jumbo-core/application/Request";
import { Response } from "jumbo-core/application/Response";
import { Scope } from "jumbo-core/ioc/Scope";
import { ViewResult } from "jumbo-core/results/ViewResult";
