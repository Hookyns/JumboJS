import * as $http from "http";
export declare class Application {
    private server;
    private serverIsReady;
    private port;
    private requests;
    private locator;
    private diContainer;
    private controllerFactory;
    private sessions;
    private sessionsSize;
    private memoryCache;
    private memoryCacheQueue;
    private memoryCacheSize;
    private blockIpListener;
    private staticFileResolver;
    private templateAdapter;
    private numberOfWorkerReady;
    serverIsRunning: boolean;
    getLocator(): Locator;
    getDIContainer(): DIContainer;
    setStaticFileResolver(handler: any): void;
    setBlockIpListener(listener: (clientIp: string) => void): void;
    static readonly instance: Application;
    setTemplateAdapter(adapter: ITemplateAdapter): void;
    constructor();
    registerIntervalTask(time: any, func: any): void;
    registerDailyTask(hour: any, minute: any, second: any, func: any): void;
    runWhenReady(port: any, callback: any): void;
    getClientIP(request: $http.IncomingMessage): string;
    static exit(): void;
    private beforeRunWhenReadyCallback();
    private setErrorHandlingEvents();
    private initClustering();
    private clusterOnExit(worker, code, signal);
    private clusterWorkerOnMessage(message);
    private clusterMasterOnMessage(worker, message);
    private createServer();
    private prepareRequestsSetting();
    private prepareHttpsServerOptions();
    private serverCallback(request, response);
    private checkStaticFileRequest(request, response);
    private checkEndingDelimiter(request, response);
    private checkIPRequestsLimit(clientIP, response);
    private checkRequestsLimit(response, clientIP);
    private processRequest(request, response, requestBeginTime);
    private procUrlParseError(match, request, response, jResponse);
    private setClientSession(jRequest, jResponse);
    private getClientSession(jRequest);
    private buildRequest(request, requestBeginTime, match);
    private checkLongFormatUrl(req, match);
    private collectBodyData(req, res);
    private createController(request, response);
    private initController(cntrll, req, res, session, scope);
    private callBeforeActions(ctrl, request);
    private callAction(controller, request);
    private afterAction(controller, actionResult);
    private storeSession(cntrll, req);
    private getTemplateCacheName(viewResult, req);
    private prepareView(controller, req, res, viewResult);
    private sendView(output, res, ctrl);
    private compileAndRenderView(viewResult, req, res, cntrl, writeToCache, tplCacheFileName);
    private prepareRenderViewProperties(req, viewResult);
    private cacheViewTemplate(tplCacheFile, compiledtemplate);
    private afterTemplateRender(ctrl);
    private plainResponse(response, message, code);
    private redirectResponse(response, url, statusCode?);
    private displayError(request, response, errObj);
    private renderException(message, ex, status, request, response);
}
import { Locator } from "jumbo-core/application/Locator";
import { DIContainer } from "jumbo-core/ioc/DIContainer";