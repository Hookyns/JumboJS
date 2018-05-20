"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorResult_1 = require("../results/ErrorResult");
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Application");
}
const $cluster = require("cluster");
const $path = require("path");
const $fs = require("fs");
const $url = require("url");
const $formidable = require("formidable");
const $https = require("https");
const $http = require("http");
const uuid = require("uuid/v1");
const Exception_1 = require("jumbo-core/exceptions/Exception");
const ViewResult_1 = require("jumbo-core/results/ViewResult");
const Cluster_1 = require("jumbo-core/cluster/Cluster");
const staticFileResolver_1 = require("../base/staticFileResolver");
const $cfg = require("jumbo-core/config-options").Configurations;
const USE_HTTPS = Jumbo.config.protocol.protocol === $cfg.Protocols.Https;
const CLIENT_MESSAGE_ID = Jumbo.Base.Controller.clientMessagesId;
const GLOBALIZATION_ENABLED = Jumbo.config.globalization.enabled;
const DEBUG_MODE = Jumbo.config.debugMode;
const JUMBO_DEBUG_MODE = Jumbo.config.jumboDebugMode;
const LOG_ENABLED = Jumbo.config.log.enabled === true;
const DEVELOPMENT_MODE = Jumbo.config.deployment == $cfg.Deployment.Development;
const CHECK_INTERVAL_TIME = 5;
const TPL_CACHE_EXTENSION = ".tplcache";
const BEFORE_ACTION_NAME = "beforeActions";
let CAN_USE_CACHE = false;
const MAX_POST_DATA_SIZE = Jumbo.config.maxPostDataSize;
const istanceKey = Symbol.for("Jumbo.Application.Application");
let instance = global[istanceKey] || null;
class Application {
    constructor() {
        this.server = null;
        this.serverIsReady = false;
        this.port = 80;
        this.requests = {
            limit: 0,
            totalCount: 0,
            checkInterval: null,
            limitIP: 0,
            banTime: 3600,
            countPerIP: {},
            blockedIPs: {}
        };
        this.locator = Locator_1.Locator.instance;
        this.diContainer = DIContainer_1.DIContainer.instance;
        this.controllerFactory = ControllerFactory_1.ControllerFactory.instance;
        this.sessions = {};
        this.sessionsSize = 0;
        this.memoryCache = {};
        this.memoryCacheQueue = [];
        this.memoryCacheSize = 0;
        this.blockIpListener = null;
        this.staticFileResolver = staticFileResolver_1.staticFileResolver;
        this.templateAdapter = null;
        this.serverIsRunning = false;
        if (new.target != ApplicationActivator) {
            throw new Error("You cannot call private constructor!");
        }
        this.setErrorHandlingEvents();
        if ($cluster.isWorker || DEBUG_MODE) {
            this.createServer();
        }
        this.serverIsReady = true;
        this.initClustering();
    }
    getLocator() {
        return this.locator;
    }
    getDIContainer() {
        return this.diContainer;
    }
    setStaticFileResolver(handler) {
        this.staticFileResolver = handler;
    }
    setBlockIpListener(listener) {
        if (typeof listener !== "function") {
            throw new Error("Listener must be function!");
        }
        this.blockIpListener = listener;
    }
    static get instance() {
        if (instance == null) {
            global[istanceKey] = instance = Reflect.construct(Application, [], ApplicationActivator);
        }
        return instance;
    }
    setTemplateAdapter(adapter) {
        if (adapter.constructor != Object || !("extension" in adapter)
            || !("preCompilation" in adapter)) {
            console.error("Adapter you are trying to register is invalid!");
            Application.exit();
        }
        this.templateAdapter = adapter;
    }
    registerIntervalTask(time, func) {
        if ($cluster.isMaster) {
            setInterval(func, time * 1000);
        }
    }
    registerDailyTask(hour, minute, second, func) {
        throw new Error("Not implemented yet!");
    }
    runWhenReady(port, callback) {
        this.port = port;
        let interval = setInterval(() => {
            if (this.serverIsReady === true) {
                clearInterval(interval);
                if (!this.beforeRunWhenReadyCallback()) {
                    Application.exit();
                    return;
                }
                CAN_USE_CACHE = this.templateAdapter.preCompilation && Jumbo.config.cache.enabled;
                if ($cluster.isMaster) {
                    console.timeEnd("Application Master load-time: ");
                    if (!DEBUG_MODE) {
                        callback();
                        return;
                    }
                }
                this.server.listen(this.port, () => {
                    this.serverIsRunning = true;
                    if (!DEBUG_MODE) {
                        console.timeEnd("Application Worker " + $cluster.worker.id + " load-time: ");
                        Cluster_1.cluster.invoke(Cluster_1.ClusterCommands.WorkerReady);
                    }
                    else {
                        Log_1.Log.line("Server is running on port " + this.port, Log_1.LogTypes.Start, 0);
                    }
                    callback();
                });
            }
        }, 50);
    }
    getClientIP(request) {
        return request.headers["X-Forwarded-For"] || request.connection.remoteAddress;
    }
    static exit() {
        if ($cluster.isMaster) {
            Log_1.Log.line("Exiting application...", Log_1.LogTypes.Std, 0);
        }
        else {
            Log_1.Log.line("Exiting child process...", Log_1.LogTypes.Std, 0);
            Cluster_1.cluster.invoke(Cluster_1.ClusterCommands.ExitApp);
        }
        process.exit(0);
    }
    workersReady() {
        Log_1.Log.line("Server is running on port " + this.port, Log_1.LogTypes.Start, 0);
    }
    beforeRunWhenReadyCallback() {
        if (!this.templateAdapter) {
            this.setTemplateAdapter(Jumbo.Adapters.TemplateAdapter);
        }
        return true;
    }
    setErrorHandlingEvents() {
        process.on("uncaughtException", function (err) {
            Log_1.Log.error(err.message + "\n" + err.stack);
            process.exit(1);
        }).on("unhandledRejection", function (err) {
            Log_1.Log.error("Unhandled rejection: " + err.message + "\n" + err.stack);
            process.exit(1);
        });
    }
    initClustering() {
        Cluster_1.cluster.initClustering();
    }
    createServer() {
        this.prepareRequestsSetting();
        if (USE_HTTPS) {
            let options = this.prepareHttpsServerOptions();
            this.server = $https.createServer(options, (req, res) => this.serverCallback(req, res));
        }
        else {
            this.server = $http.createServer((req, res) => this.serverCallback(req, res));
        }
        this.server.on("error", (err) => {
            if (err !== null) {
                Log_1.Log.error("Server couldn't be started. Maybe port is blocked.\n" + err.message, Log_1.LogTypes.Std);
                Application.exit();
            }
        });
    }
    prepareRequestsSetting() {
        if (Jumbo.config.maxRequestPerSecond !== 0) {
            this.requests.limit = Jumbo.config.maxRequestPerSecond || this.requests.limit;
            this.requests.checkInterval = setInterval(() => {
                this.requests.totalCount = 0;
                this.requests.countPerIP = {};
            }, CHECK_INTERVAL_TIME * 1000);
        }
        if (Jumbo.config.DOSPrevention && Jumbo.config.DOSPrevention.enabled === true) {
            this.requests.limitIP = Jumbo.config.DOSPrevention.maxRequestPerIP || this.requests.limitIP;
            this.requests.banTime = Jumbo.config.DOSPrevention.blockTime || this.requests.banTime;
        }
        else if (Jumbo.config.DOSPrevention && Jumbo.config.DOSPrevention.enabled === false) {
            this.requests.limitIP = 0;
        }
    }
    prepareHttpsServerOptions() {
        let options = {};
        if (Jumbo.config.protocol.privateKey && Jumbo.config.protocol.certificate) {
            try {
                options.key = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.privateKey));
                options.cert = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.certificate));
            }
            catch (ex) {
                Log_1.Log.error("Error ocurs while reading private key or certificate. " + ex.message);
                Application.exit();
            }
        }
        else if (Jumbo.config.protocol.pfx) {
            try {
                options.pfx = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.pfx));
            }
            catch (ex) {
                Log_1.Log.error("Error ocurs while reading pkcs archive. " + ex.message);
                Application.exit();
            }
        }
        else {
            Log_1.Log.error("You have not configured HTTPS server properly, key or certificate missing.");
            Application.exit();
        }
        if (Jumbo.config.protocol.passphrase) {
            options.passphrase = Jumbo.config.protocol.passphrase;
        }
        return options;
    }
    async serverCallback(request, response) {
        let requestBeginTime = new Date().getTime();
        response.setHeader("X-Powered-By", "JumboJS");
        let clientIP = this.getClientIP(request);
        try {
            let canContinue = this.checkRequestsLimit(response, clientIP);
            if (!canContinue)
                return;
            canContinue = this.checkIPRequestsLimit(clientIP, response);
            if (!canContinue)
                return;
            canContinue = this.checkEndingDelimiter(request, response);
            if (!canContinue)
                return;
            let aliasOrigUrl;
            if (!!(aliasOrigUrl = this.locator.getUrlForAlias(request.url))) {
                request.url = aliasOrigUrl;
            }
            canContinue = await this.checkStaticFileRequest(request, response);
            if (!canContinue)
                return;
            await this.processRequest(request, response, requestBeginTime);
        }
        catch (ex) {
            await this.displayError(request, response, ex);
        }
    }
    async checkStaticFileRequest(request, response) {
        if (request.method == "GET" && request.url.slice(0, 7) === "/public") {
            let url = decodeURI(request.url);
            let filePath = $path.join(Jumbo.BASE_DIR, url);
            if (filePath.slice(0, Jumbo.PUBLIC_DIR.length) != Jumbo.PUBLIC_DIR) {
                this.plainResponse(response, "Bad Request", 400);
                return false;
            }
            return await new Promise((resolve, reject) => {
                this.staticFileResolver(filePath, (error, fileStream, mime, size, headers) => {
                    try {
                        if (error) {
                            this.displayError(request, response, {
                                statusCode: 404,
                                message: "File '" + url + "' error. " + error.message
                            });
                            return resolve(false);
                        }
                        Log_1.Log.line("Streaming static file '" + url + "'.", Log_1.LogTypes.Http, Log_1.LogLevels.Talkative);
                        if (!headers || headers.constructor != Object) {
                            headers = {
                                "Content-Type": mime,
                                "Content-Length": size,
                                "Cache-Control": "public, max-age=43200"
                            };
                        }
                        response.writeHead(200, headers);
                        fileStream.pipe(response);
                        return resolve(false);
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        }
        return true;
    }
    checkEndingDelimiter(request, response) {
        let urlWithoutEndingDelim;
        if (request.url.slice(-1) == this.locator.delimiter
            && (urlWithoutEndingDelim = request.url.replace(Locator_1.END_DELIMITER_TRIM_REGEX, ""))) {
            Log_1.Log.line("Url ends with delimiter(s), redirecting to url without it.", Log_1.LogTypes.Http, Log_1.LogLevels.Talkative);
            this.redirectResponse(response, urlWithoutEndingDelim);
            return false;
        }
        return true;
    }
    checkIPRequestsLimit(clientIP, response) {
        if (this.requests.limitIP != 0) {
            if (this.requests.blockedIPs[clientIP]) {
                if (this.requests.blockedIPs[clientIP] <= new Date().getTime()) {
                    delete this.requests.blockedIPs[clientIP];
                }
                else {
                    this.plainResponse(response, "We're sorry but server reject your request.", 503);
                    return false;
                }
            }
            if (!this.requests.countPerIP[clientIP]) {
                this.requests.countPerIP[clientIP] = 1;
            }
            else {
                if (++this.requests.countPerIP[clientIP] > this.requests.limitIP * CHECK_INTERVAL_TIME) {
                    this.requests.blockedIPs[clientIP] = new Date().getTime() + this.requests.banTime * 1000;
                    Log_1.Log.warning("Client from ip " + clientIP
                        + " reached the ip/requests/sec limit and was blocked.", Log_1.LogTypes.Http);
                    if (this.blockIpListener != null) {
                        this.blockIpListener(clientIP);
                    }
                }
            }
        }
        return true;
    }
    checkRequestsLimit(response, clientIP) {
        if (this.requests.limit != 0) {
            if (++this.requests.totalCount > this.requests.limit * CHECK_INTERVAL_TIME) {
                this.plainResponse(response, "We're sorry but server reject your request because of overload.", 503);
                if (this.requests.totalCount == (this.requests.limit + 1)) {
                    Log_1.Log.warning("Limit of request per second was reached. Last request come from: "
                        + clientIP, Log_1.LogTypes.Http, Log_1.LogLevels.Talkative);
                }
                return false;
            }
        }
        return true;
    }
    async processRequest(request, response, requestBeginTime) {
        const jResponse = new Response_1.Response(response);
        let match = this.locator.parseUrl(request);
        if (!match || match.constructor != Object) {
            return this.procUrlParseError(match, request, response, jResponse);
        }
        const jRequest = this.buildRequest(request, requestBeginTime, match);
        let redirectTo = this.checkLongFormatUrl(jRequest, match);
        if (redirectTo)
            return jResponse.redirectUrl(redirectTo);
        this.setClientSession(jRequest, jResponse);
        jRequest.body = await this.collectBodyData(jRequest, jResponse);
        if (DEBUG_MODE) {
            console.log(`[DEBUG] Request target point Sub-App ${jRequest.subApp}, Controller ${jRequest.controllerFullName}, `
                + `Action ${jRequest.actionFullName}, Method ${jRequest.method}`);
        }
        let ctrl = await this.createController(jRequest, jResponse);
        let actionResult = await this.callBeforeActions(ctrl, jRequest);
        if (actionResult !== undefined)
            await this.afterAction(ctrl, actionResult);
        if (!response.finished && !ctrl.exited) {
            actionResult = await this.callAction(ctrl, jRequest);
            if (actionResult !== undefined)
                await this.afterAction(ctrl, actionResult);
        }
        this.storeSession(ctrl, jRequest);
        if (LOG_ENABLED) {
            Log_1.Log.line(request.method.toUpperCase() + " " + (jRequest.noCache ? "no-cached " : "")
                + request.headers.host + request.url + ` (${jRequest.subApp} subapp)`
                + ` returned in ${new Date().getTime() - jRequest.beginTime} ms`);
        }
        if (ctrl.exited)
            return;
        if (!response.finished) {
            response.end();
        }
        throw new Error(`Action '${jRequest.actionFullName}'`
            + ` in controller '${jRequest.controllerFullName}' wasn't exited.`);
    }
    async procUrlParseError(match, request, response, jResponse) {
        if (match == null || !match.redirectTo) {
            return this.displayError(request, response, {
                statusCode: 404,
                message: `Page not found. Requested URL '${request.url}'`
            });
        }
        return jResponse.redirectUrl(match.redirectTo, match.statusCode);
    }
    setClientSession(jRequest, jResponse) {
        if (!(jRequest.sessionId = jRequest.getCookie(Jumbo.config.session.sessionsCookieName))) {
            jRequest.sessionId = uuid();
            jResponse.setCookie(Jumbo.config.session.sessionsCookieName, jRequest.sessionId, null, null, "/");
        }
    }
    async getClientSession(jRequest) {
        let session = this.sessions[jRequest.sessionId];
        if (session != undefined) {
            return session;
        }
        if (Jumbo.config.session.justInMemory === true) {
            return {};
        }
        return await new Promise(resolve => {
            $fs.readFile($path.join(Jumbo.SESSION_DIR, jRequest.sessionId + ".session"), "utf-8", (err, sessJson) => {
                if (!err) {
                    try {
                        resolve(JSON.parse(sessJson) || {});
                    }
                    catch (e) {
                    }
                }
                resolve({});
            });
        });
    }
    buildRequest(request, requestBeginTime, match) {
        let target = this.controllerFactory.getTargetPoint(match.subApp, match.controller, match.action, request.method);
        let req = new Request_1.Request(request);
        req._bindLocation(match.location, target.subApp, target.controller, target.action, match.params);
        req.beginTime = requestBeginTime;
        req.locale = match.locale || this.locator.requestLocaleOrDefault(request);
        return req;
    }
    checkLongFormatUrl(req, match) {
        if (req.action == Locator_1.DEFAULT_ACTION && match.controllerInUrl) {
            let url = req.request.url;
            let query = $url.parse(url).query || "";
            if (query)
                query = "?" + query;
            if (req.controller == Locator_1.DEFAULT_CONTROLLER) {
                if (GLOBALIZATION_ENABLED)
                    return "/" + req.locale + query;
                return "/" + query;
            }
            else if (match.actionInUrl) {
                let delimiter = this.locator.delimiter;
                if (GLOBALIZATION_ENABLED)
                    return "/" + req.locale + delimiter + req.controller + query;
                return "/" + req.controller + query;
            }
        }
        return null;
    }
    async collectBodyData(req, res) {
        let end = false;
        let form = new $formidable.IncomingForm();
        form.uploadDir = Jumbo.UPLOAD_DIR;
        form.keepExtensions = true;
        return await new Promise((resolve, reject) => {
            form.on("progress", async () => {
                try {
                    if (form.bytesExpected > MAX_POST_DATA_SIZE) {
                        end = true;
                        form.emit("error", "The post data received is too big");
                        await this.displayError(req.request, res.response, {
                            statusCode: 413,
                            message: "The post data received is too big"
                        });
                        req.request.connection.destroy();
                    }
                }
                catch (e) {
                    reject(e);
                }
            });
            form.parse(req.request, (err, fields, files) => {
                if (end) {
                    return;
                }
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ fields: fields, files: files });
                }
            });
        });
    }
    async createController(request, response) {
        let scope = new Jumbo.Ioc.Scope();
        let ctrl = this.controllerFactory.createController(this.controllerFactory.getControllerId(request.controller), this.controllerFactory.getSubAppId(request.subApp), scope);
        let session = await this.getClientSession(request);
        this.initController(ctrl, request, response, session, scope);
        return ctrl;
    }
    initController(cntrll, req, res, session, scope) {
        cntrll._initController(req, res, session, scope);
        if (req.body != null) {
        }
    }
    async callBeforeActions(ctrl, request) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.callBeforeActions() called");
        }
        let beforeActions = ctrl[BEFORE_ACTION_NAME];
        if (beforeActions) {
            let beforeActionsResult = beforeActions();
            if (beforeActionsResult.constructor != Promise) {
                throw new Error(`Action 'beforeActions' in ${ctrl.constructor.name} `
                    + "is not async method (does not return Promise).");
            }
            let result = await beforeActionsResult;
            if (result != undefined)
                return result;
        }
    }
    async callAction(controller, request) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.callAction() called");
        }
        let action = controller[request.actionFullName];
        if (action) {
            let controllerId = request.controllerFullName.toLowerCase();
            let actionId = request.actionFullName.toLowerCase();
            let subAppId = request.subApp.toLowerCase();
            let actionParams = this.controllerFactory.getActionInfo(actionId, controllerId, subAppId).params;
            let args = [];
            for (let param of actionParams) {
                args.push(request.params[param] || undefined);
            }
            let rtrnVal = action.apply(controller, args);
            if (rtrnVal.constructor != Promise) {
                throw new Error(`Action '${request.actionFullName}' in controller `
                    + request.controllerFullName + " is not async method (does not return Promise)");
            }
            return await rtrnVal;
        }
    }
    async afterAction(controller, actionResult) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.afterAction() called");
        }
        let req = controller.request;
        let res = controller.response;
        if (actionResult === null) {
            controller.exited = true;
            return res.response.end("");
        }
        if (actionResult.constructor === Object) {
            return Controller_1.Controller.prototype.json.call(controller, actionResult);
        }
        if (actionResult.constructor === String) {
            return Controller_1.Controller.prototype.data.call(controller, actionResult, "text/plain");
        }
        if (actionResult.constructor === ErrorResult_1.ErrorResult || actionResult.constructor === Error || actionResult.constructor === Exception_1.Exception) {
            controller.exited = true;
            return this.displayError(req.request, res.response, actionResult);
        }
        if (actionResult.constructor == ViewResult_1.ViewResult) {
            actionResult.data.lang = controller.request.locale.slice(0, 2);
            actionResult.data._context = actionResult;
            actionResult.messages = actionResult.data.clientMessages = (controller.crossRequestData[CLIENT_MESSAGE_ID] || {});
            actionResult.locale = controller.request.locale;
            await this.prepareView(controller, req, res, actionResult);
            if (JUMBO_DEBUG_MODE) {
                console.log("[DEBUG] Application.afterAction() after prepareView call");
            }
        }
        else {
            throw new Error(`Unexpected return value of action '${req.actionFullName}'`
                + ` in controller '${req.controllerFullName}' or action wasn't exited.`);
        }
    }
    storeSession(cntrll, req) {
        if (cntrll.session && Object.keys(cntrll.session).length != 0) {
            this.sessions[req.sessionId] = cntrll.session;
            if (Jumbo.config.session.justInMemory !== true) {
                $fs.writeFile($path.join(Jumbo.SESSION_DIR, req.sessionId + ".session"), JSON.stringify(cntrll.session), "utf-8", () => {
                });
            }
        }
    }
    getTemplateCacheName(viewResult, req) {
        let tplCacheFileName = (req.subApp || "Default") + "-";
        if (viewResult.view) {
            tplCacheFileName += viewResult.view.replace(/[^\w\\\/]/g, "").replace(/[\/\\]/g, "-");
            if (viewResult.partialView) {
                if (viewResult.snippet) {
                    tplCacheFileName += "_snippet-" + viewResult.snippet;
                }
                else {
                    tplCacheFileName += "_partial-template";
                }
            }
        }
        else {
            tplCacheFileName += req.controller + "-" + req.action;
        }
        tplCacheFileName += TPL_CACHE_EXTENSION;
        return $path.join(Jumbo.CACHE_DIR, tplCacheFileName);
    }
    async prepareView(controller, req, res, viewResult) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.prepareView() called");
        }
        if (!viewResult.view) {
            viewResult.view = req.controller + "/" + req.action;
        }
        let tplCacheFile = this.getTemplateCacheName(viewResult, req);
        if (viewResult.rawTemplate) {
            let appPath = this.getAppPath(req);
            let templatePath = this.getTemplatePath(appPath, viewResult);
            return await new Promise((resolve, reject) => {
                $fs.readFile(templatePath, "utf-8", (err, content) => {
                    if (err) {
                        return reject(err);
                    }
                    try {
                        this.sendView(content, res, controller);
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        }
        if (req.noCache || !CAN_USE_CACHE) {
            return await this.compileAndRenderView(viewResult, req, res, controller, CAN_USE_CACHE, tplCacheFile);
        }
        if (this.memoryCacheQueue.indexOf(tplCacheFile) != -1) {
            let tpl = await this.templateAdapter.renderPreCompiled(this.memoryCache[tplCacheFile], viewResult.data, controller);
            return this.sendView(tpl, res, controller);
        }
        if (DEBUG_MODE) {
            console.log("[DEBUG] Reading template from cache file");
        }
        return await new Promise((resolve, reject) => {
            $fs.readFile(tplCacheFile, "utf-8", async (err, content) => {
                try {
                    if (err) {
                        await this.compileAndRenderView(viewResult, req, res, controller, true, tplCacheFile);
                        return resolve();
                    }
                    let tpl = await this.templateAdapter.renderPreCompiled(content, viewResult.data, controller);
                    this.sendView(tpl, res, controller);
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    sendView(output, res, ctrl) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.sendView() called");
        }
        let response = res.response;
        res.headers["Content-Length"] = Buffer.byteLength(output, "utf-8");
        response.writeHead(200, res.headers);
        response.end(output);
        this.afterTemplateRender(ctrl);
    }
    async compileAndRenderView(viewResult, req, res, cntrl, writeToCache, tplCacheFileName) {
        if (JUMBO_DEBUG_MODE) {
            console.log("[DEBUG] Application.renderView() called");
        }
        let { templatePath, layoutPath, dynamicLayout } = this.prepareRenderViewProperties(req, viewResult);
        if (writeToCache) {
            if (DEBUG_MODE) {
                console.log("[DEBUG] Precompiling template");
            }
            let compiledtemplate = await this.templateAdapter.preCompile(templatePath, layoutPath, dynamicLayout);
            this.cacheViewTemplate(tplCacheFileName, compiledtemplate);
            if (DEBUG_MODE) {
                console.log("[DEBUG] Rendering template");
            }
            let tpl = await this.templateAdapter.renderPreCompiled(compiledtemplate, viewResult.data, cntrl);
            this.sendView(tpl, res, cntrl);
        }
        else {
            if (DEBUG_MODE) {
                console.log("[DEBUG] Complete (compile and) render");
            }
            let tpl = await this.templateAdapter.render(templatePath, layoutPath, dynamicLayout, viewResult.data, cntrl);
            this.sendView(tpl, res, cntrl);
        }
    }
    prepareRenderViewProperties(req, viewResult) {
        let appPath = this.getAppPath(req);
        let templatePath = this.getTemplatePath(appPath, viewResult);
        let layoutPath = null;
        let dynamicLayout = null;
        if (viewResult.snippet) {
            dynamicLayout = '{include ' + viewResult.snippet + '}';
            if (DEBUG_MODE) {
                console.log("[DEBUG] Rendering snippet ", viewResult.snippet, "of", templatePath);
            }
        }
        else if (viewResult.partialView) {
            if (DEBUG_MODE) {
                console.log("[DEBUG] Rendering partial template ", templatePath);
            }
        }
        else {
            layoutPath = $path.join(appPath, "templates", "layout" + this.templateAdapter.extension);
            if (DEBUG_MODE) {
                console.log("[DEBUG] Rendering template '", templatePath, "' with layout", layoutPath);
            }
        }
        return { templatePath, layoutPath, dynamicLayout };
    }
    getTemplatePath(appPath, viewResult) {
        return $path.join(appPath, "templates", viewResult.view + this.templateAdapter.extension);
    }
    getAppPath(req) {
        if (req.subApp == ControllerFactory_1.MAIN_SUBAPP_NAME) {
            return Jumbo.APP_DIR;
        }
        return $path.join(Jumbo.APP_DIR, "sub-apps", this.controllerFactory.getSubAppInfo(req.subApp).dir);
    }
    cacheViewTemplate(tplCacheFile, compiledtemplate) {
        if (this.memoryCache[tplCacheFile]) {
            this.memoryCacheSize -= this.memoryCache[tplCacheFile].length;
            delete this.memoryCache[tplCacheFile];
        }
        let size = compiledtemplate.length;
        if (size < Jumbo.config.cache.memoryCacheSizeLimit) {
            while (this.memoryCacheSize + size > Jumbo.config.cache.memoryCacheSizeLimit) {
                let item = this.memoryCacheQueue.shift();
                this.memoryCacheSize -= this.memoryCache[item].length;
                delete this.memoryCache[item];
            }
            this.memoryCache[tplCacheFile] = compiledtemplate;
            this.memoryCacheSize += size;
            this.memoryCacheQueue.push(tplCacheFile);
        }
        $fs.writeFile(tplCacheFile, compiledtemplate, () => {
        });
    }
    afterTemplateRender(ctrl) {
        ctrl._clearOldCrossRequestData();
        ctrl.exit();
    }
    plainResponse(response, message, code) {
        response.writeHead(code, {
            "Content-Type": "text/plain",
            "Content-Length": Buffer.byteLength(message, "utf-8")
        });
        response.end(message);
    }
    redirectResponse(response, url, statusCode = 302) {
        response.writeHead(statusCode, { "Location": url });
        response.end();
    }
    async displayError(request, response, errObj) {
        let ex = errObj.error || errObj;
        let errorObj = {
            message: errObj.message || ex.message,
            status: ex.statusCode || errObj.status || 500,
            stack: ex.stack
        };
        Log_1.Log.warning("Error while serving " + request.url + "; Client " + this.getClientIP(request) + "; "
            + errorObj.stack, Log_1.LogTypes.Http);
        if (response.finished)
            return;
        if (DEVELOPMENT_MODE && (ex instanceof Error || ex instanceof Exception_1.Exception)) {
            return this.renderException(errorObj.message, ex, errorObj.status, request, response);
        }
        let errFile = $path.resolve(Jumbo.ERR_DIR, errorObj.status + ".html");
        let errExists = await new Promise(resolve => {
            $fs.access(errFile, $fs.constants.R_OK, err => {
                resolve(!err);
            });
        });
        if (errExists) {
            this.staticFileResolver(errFile, (error, fileStream, mime, size) => {
                if (error) {
                    Log_1.Log.error("Applicaton.displayError(): " + error.message);
                    return this.plainResponse(response, "Internal server error.", 500);
                }
                response.writeHead(errorObj.status, { "Content-Type": "text/html", "Content-Length": size });
                fileStream.pipe(response);
            });
        }
        else {
            try {
                this.plainResponse(response, errorObj.status, "Status code " + errorObj.status + "\nWe're sorry but some error occurs.");
            }
            catch (ex) {
                Log_1.Log.error(ex.message, Log_1.LogTypes.Std);
            }
        }
    }
    renderException(message, ex, status, request, response) {
        let result = require("jumbo-core/exception-template.js")(message, ex, status, request);
        response.writeHead(status, {
            "Content-Type": "text/html",
            "Content-Length": Buffer.byteLength(result, "utf-8")
        });
        response.end(result);
    }
}
exports.Application = Application;
class ApplicationActivator extends Application {
}
const Locator_1 = require("jumbo-core/application/Locator");
const ControllerFactory_1 = require("jumbo-core/application/ControllerFactory");
const DIContainer_1 = require("jumbo-core/ioc/DIContainer");
const Log_1 = require("jumbo-core/logging/Log");
const Response_1 = require("jumbo-core/application/Response");
const Request_1 = require("jumbo-core/application/Request");
const Controller_1 = require("jumbo-core/base/Controller");
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Application END");
}
//# sourceMappingURL=Application.js.map