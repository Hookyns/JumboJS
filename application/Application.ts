/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Application");
}

//region Imports

import * as $cluster from "cluster"
import * as $path from "path";
import * as $fs from "fs";
import * as $url from "url";
import * as $formidable from "formidable";
import * as $https from "https";
import * as $http from "http";
import * as uuid from "uuid/v1";

import * as $clusterCmds from "jumbo-core/cluster/cluster-messaging";
import * as fileExtensionToMimeMap from "jumbo-core/utils/file-extension-to-mime-map";
import {Exception} from "jumbo-core/exceptions/Exception";
import {ViewResult} from "jumbo-core/results/ViewResult";

const $cfg = require("jumbo-core/config").Configurations;

//endregion

//region Consts

const USE_HTTPS = Jumbo.config.protocol.protocol === $cfg.Protocols.Https;
const CLIENT_MESSAGE_ID = Jumbo.Base.Controller.clientMessagesId;
const GLOBALIZATION_ENABLED = Jumbo.config.globalization.enabled;
const DEBUG_MODE = Jumbo.config.debugMode; // Does application run in debug mode?
const JUMBO_DEBUG_MODE = Jumbo.config.jumboDebugMode; // Does application run in debug mode?
const LOG_ENABLED = Jumbo.config.log.enabled === true; // Is logging enabled?
const DEVELOPMENT_MODE = Jumbo.config.deployment == $cfg.Deployment.Development; // Does application run in debug mode?
const CHECK_INTERVAL_TIME = 5;// Number of seconds, time for collecting data, after that time are limits (amplified by
                              // this number) checked
const TPL_CACHE_EXTENSION = ".tplcache"; // Extension for template cache files
const CPU_COUNT = !Jumbo.config.clustering.numberOfWorkers
	? require('os').cpus().length
	: Jumbo.config.clustering.numberOfWorkers;
const BEFORE_ACTION_NAME = "beforeActions";
let CAN_USE_CACHE = false;
const MAX_POST_DATA_SIZE = Jumbo.config.maxPostDataSize;

//endregion

// Aplication singleton instance
const istanceKey = Symbol.for("Jumbo.Application.Application");
let instance: Application = global[istanceKey] || null;

/**
 * Class which contain HTTP server and do all the basic job around requests.
 * It cares about static files, POST data, routing, creation of controllers and calling actions
 * @memberOf Jumbo.Application
 * @static
 */
export class Application
{
	//region Fields

	/**
	 * HTTP(S) server
	 */
	private server: $http.Server | $https.Server = null;

	/**
	 * Will be true after completing all startup tasks.
	 * This fields is checked by interval in runWhenReady
	 */
	private serverIsReady: boolean = false;

	/**
	 * HTTP server port
	 */
	private port: number = 80;

	/**
	 * Requests stats
	 */
	private requests: { // Loaded from config, these values are default
		limit: number,
		totalCount: number,
		checkInterval: NodeJS.Timer,

		limitIP: number,
		banTime: number,
		countPerIP: { [ip: string]: number },
		blockedIPs: { [ip: string]: number } // xxx.xxx.xxx.xxx": Time() // Ban end time
	} = {
		limit: 0, // 0  disabled
		totalCount: 0,
		checkInterval: null,

		limitIP: 0,
		banTime: 3600,
		countPerIP: {},
		blockedIPs: {}
	};

	/**
	 * Locator for adress verifying and resolving
	 */
	private locator: Locator = Locator.instance;

	/**
	 * DIContainer for resolving rependencies
	 */
	private diContainer: DIContainer = DIContainer.instance;

	/**
	 * Controller factory
	 */
	private controllerFactory: ControllerFactory = ControllerFactory.instance;

	/**
	 * Memory sessions
	 */
	private sessions: { [sessionIdKey: string]: { [key: string]: any } } = {};

	// noinspection JSUnusedLocalSymbols
	/**
	 * Current size of saved session data // TODO: Implement
	 */
	private sessionsSize: number = 0;

	/**
	 * Memory cache for compiled templates
	 */
	private memoryCache = {};

	/**
	 * Array creating FIFO queue which will hold memoryCache IDs in order as added
	 * If memoryCacheSize will be reached, first added ID will be removed
	 */
	private memoryCacheQueue: string[] = [];

	/**
	 * Current size of cached templates
	 */
	private memoryCacheSize: number = 0;

	/**
	 * Listener which will be called when after IP block
	 */
	private blockIpListener: (clientIp: string) => void = null;

	/**
	 * Handler which should return file for given URL
	 */
	private staticFileResolver: (fileName: string,
		callback: (error: Error,
			readStream: $fs.ReadStream,
			mime: string,
			size: number,
			headers?: { [key: string]: any }) => void) => void;

	/**
	 * Template adapter
	 */
	private templateAdapter: ITemplateAdapter = null;

	/**
	 * If clustering enabled, hold number of workers ready
	 */
	private numberOfWorkerReady: number;

	/**
	 * Will be true after setting up http server
	 */
	public serverIsRunning: boolean = false;

	//endregion

	//region Properties

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Return Locator instance
	 * @returns {Locator}
	 */
	public getLocator()
	{
		return this.locator;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Return DI Container
	 * @returns {DIContainer}
	 */
	public getDIContainer()
	{
		return this.diContainer;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Set handler for resolving static files
	 * @param {function} handler
	 */
	public setStaticFileResolver(handler)
	{
		this.staticFileResolver = handler;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * You can obtain blocked IPs through your listener registered here
	 * @param {function} listener
	 */
	public setBlockIpListener(listener: (clientIp: string) => void)
	{
		if (typeof listener !== "function")
		{
			throw new Error("Listener must be function!");
		}

		this.blockIpListener = listener;
	}

	/**
	 * Get instance of Application
	 * @return {Application}
	 */
	static get instance(): Application
	{
		if (instance == null)
		{
			global[istanceKey] = instance = Reflect.construct(Application, [], ApplicationActivator);
		}

		return instance;
	}

	/**
	 * Set your template adapter
	 * @param {ITemplateAdapter} adapter
	 */
	public setTemplateAdapter(adapter: ITemplateAdapter)
	{
		if (adapter.constructor != Object || !("extension" in adapter)
			|| !("preCompilation" in adapter)
		)
		{
			console.error("Adapter you are trying to register is invalid!");
			Application.exit();
		}

		this.templateAdapter = adapter;
	}

	//endregion

	//region Ctors

	/**
	 * Constructs Application
	 */
	constructor()
	{
		if (new.target != ApplicationActivator)
		{
			throw new Error("You cannot call private constructor!");
		}

		this.staticFileResolver = (fileName, callback) => {
			$fs.lstat(fileName, (error, stats) => {
				if (error)
				{
					callback(error, null, null, null);
					return;
				}

				if (stats.isFile())
				{
					let mime = fileExtensionToMimeMap[$path.extname(fileName).slice(1)];
					callback(null, $fs.createReadStream(fileName), mime, stats.size);
				}
				else if (stats.isDirectory())
				{
					callback(new Error("Accessing folder content is not allowed."), null, null, null);
				}
				else
				{
					callback(new Error("File not found."), null, null, null);
				}
			});
		};

		if ($cluster.isWorker || DEBUG_MODE)
		{
			this.createServer();
		}

		this.serverIsReady = true;
		this.initClustering();
		this.setErrorHandlingEvents();
	}

	//endregion

	//region Public methods

	// noinspection JSMethodCanBeStatic, JSUnusedGlobalSymbols
	/**
	 * Register function which will be executed in interval of given length
	 * @param {Number} time Number of seconds
	 * @param {Function} func Your function
	 */
	registerIntervalTask(time, func)
	{
		if ($cluster.isMaster)
		{
			setInterval(func, time * 1000);
		}
	}

	// noinspection JSMethodCanBeStatic, JSUnusedGlobalSymbols
	/**
	 * Register function which will be executed once per day in given time
	 * @param {Number} hour Hour when you want to run your function
	 * @param {Number} minute Minute in hour when you want to run your function
	 * @param {Number} second Second in minute
	 * @param {Function} func Your function
	 */
	registerDailyTask(hour, minute, second, func)
	{
		throw new Error("Not implemented yet!");

		// if ($cluster.isMaster) {
		// 	var now = new Date();
		// 	var hDiff = hour - now.getHours();
		// 	var mDiff = minute - now.getMinutes();
		// 	var sDiff = second - now.getSeconds();
		// 	var timeToRun = 0;
		//
		// TODO: Implement
		// 	if (hDiff < 0 && mDiff < 0 && sDiff < 0) {
		//
		// 	} else {
		//
		// 	}
		//
		// 	setTimeout(function() {
		// 		setInterval(func, 1000 * 60 * 60 * 24);
		// 	}, timeToExecute);
		// }
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Register sign that you want to run application. Application is gonna be run when ready.
	 * @param {Number} port
	 * @param {Function} callback
	 */
	runWhenReady(port, callback)
	{
		this.port = port;

		let interval = setInterval(() => {
			if (this.serverIsReady === true)
			{
				clearInterval(interval);

				if (!this.beforeRunWhenReadyCallback())
				{
					Application.exit();
					return;
				}

				CAN_USE_CACHE = this.templateAdapter.preCompilation && Jumbo.config.cache.enabled;

				if ($cluster.isMaster)
				{
					console.timeEnd("Application Master load-time: ");

					if (!DEBUG_MODE)
					{
						callback();
						return;
					}
				}

				// Listen on given port
				this.server.listen(this.port, () => {

					this.serverIsRunning = true;

					// Print by framework registered load-time timer
					if (!DEBUG_MODE)
					{
						console.timeEnd("Application Worker " + $cluster.worker.id + " load-time: ");

						//Invoke worker ready
						$clusterCmds.invoke($clusterCmds.Commands.WorkerReady);
					}
					else
					{
						// Logged when in debugMode; from Master
						Log.line("Server is running on port " + this.port, LogTypes.Start, 0);
					}

					callback();
				});
			}
		}, 50);
	}

	//noinspection JSMethodCanBeStatic
	/**
	 * Returns IP address from given reques
	 * @param request
	 * @returns {String}
	 */
	getClientIP(request: $http.IncomingMessage): string
	{
		return <string>request.headers["X-Forwarded-For"] || request.connection.remoteAddress;
	}

	/**
	 * Exit application
	 */
	static exit()
	{
		if ($cluster.isMaster)
		{
			Log.line("Exiting application...", LogTypes.Std, 0);
		}
		else
		{
			Log.line("Exiting child process...", LogTypes.Std, 0);
			$clusterCmds.invoke($clusterCmds.Commands.ExitApp);
		}
		process.exit(0);
	}

	//endregion

	//region Private methods

	//region Booting methods

	/**
	 * This methods is called before whenReadyCallback
	 * This method check some settings before run
	 * @returns {boolean}
	 */
	private beforeRunWhenReadyCallback()
	{
		// Check template adapter
		if (!this.templateAdapter)
		{
			this.setTemplateAdapter(Jumbo.Adapters.TemplateAdapter);
		}

		// // Create RegExp for checking default action URL
		// defaultActionRegExp = new RegExp("^/\w+" + Jumbo.Application.Locator.instance.delimiter +
		// Application.defaultAction + "$");

		return true;
	}

	/**
	 * Set process event handler for unhandled errors
	 */
	private setErrorHandlingEvents()
	{
		process.on("uncaughtException", function (err) {
			Log.error(err.message + "\n" + err.stack);
			process.exit(1);
		}).on("unhandledRejection", function (err) {
			Log.error("Unhandled rejection: " + err.message + "\n" + err.stack);
			process.exit(1);
		})
	}

	/**
	 * Initiate application clustering
	 * @private
	 */
	private initClustering()
	{
		if ($cluster.isMaster)
		{
			// Fork this process - start clustering
			if (Jumbo.config.clustering && typeof Jumbo.config.clustering.numberOfWorkers == "number"
				&& !DEBUG_MODE)
			{
				for (let c = 0; c < CPU_COUNT; c++)
				{
					$cluster.fork();
				}

				$cluster.on("exit", (worker, code, signal) => {
					this.clusterOnExit(worker, code, signal);
				}).on("message", (worker, message) => {
					this.clusterMasterOnMessage(worker, message);
				});
			}
		}
		else
		{
			process.on("message", (message) => {
				this.clusterWorkerOnMessage(message);
			});
		}
	}

	/**
	 * Handler for cluster exit (if worker exit)
	 * @param worker
	 * @param code
	 * @param signal
	 */
	private clusterOnExit(worker, code, signal)
	{
		Log.line(`Worker ${worker.id} exited with code: ${code == undefined ? (signal || "unknown") : code}`);

		// wanted exit
		if (code == 0) return;

		// Refork process after 1 sec
		setTimeout(() => {
			Log.line(`Reforking worker ${worker.id}`);
			$cluster.fork();
		}, 1000);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Handler for worker messages
	 * @param message
	 */
	private clusterWorkerOnMessage(message)
	{
		if (message.hasOwnProperty("exit"))
		{
			process.exit(message["exit"]);
		}
	}

	/**
	 * Handler for master messages
	 * @param {$cluster.Worker} worker
	 * @param message
	 */
	private clusterMasterOnMessage(worker: $cluster.Worker, message)
	{
		Log.line("[Worker " + worker.id + "] sent message: " + JSON.stringify(message),
			LogTypes.Std, LogLevels.TalkativeCluster);

		switch (message.invokeAction)
		{
			// Logging
			case $clusterCmds.Commands.Log:
				Log.line(message.invokeData.message, message.invokeData.type, message.invokeData.level);
				break;
			// WorkerReady
			case $clusterCmds.Commands.WorkerReady:
				this.numberOfWorkerReady++;
				if (this.numberOfWorkerReady == CPU_COUNT)
				{
					Log.line("Server is running on port " + this.port, LogTypes.Start, 0);
				}
				break;
			case $clusterCmds.Commands.ExitApp:
				Application.exit();
				break;
			case $clusterCmds.Commands.RestartWorker:
				// Create new worker
				$cluster.fork().on("online", () => {
					setTimeout(() => {
						// exit old worker
						worker.send({exit: 0});
					}, 1000);
				});
				break;
			default:
				Log.warning("Not implemented cluster message (code " + message.invokeAction + ").");
				break;
		}
	}

	/**
	 * Create http(s) server
	 */
	private createServer()
	{
		this.prepareRequestsSetting();

		if (USE_HTTPS)
		{
			let options = this.prepareHttpsServerOptions();
			this.server = $https.createServer(options, (req, res) => this.serverCallback(req, res));
		}
		else
		{
			this.server = $http.createServer((req, res) => this.serverCallback(req, res));
		}

		this.server.on("error", (err) => {
			if (err !== null)
			{
				Log.error("Server couldn't be started. Maybe port is blocked.\n" + err.message, LogTypes.Std);
				Application.exit();
			}
		});
	}

	/**
	 * Read config and setup application's state
	 */
	private prepareRequestsSetting()
	{
		if (Jumbo.config.maxRequestPerSecond !== 0)
		{
			// Initiate request count limits
			this.requests.limit = Jumbo.config.maxRequestPerSecond || this.requests.limit;
			this.requests.checkInterval = setInterval(() => {
				this.requests.totalCount = 0;
				this.requests.countPerIP = {};
			}, CHECK_INTERVAL_TIME * 1000);
		}

		// Initiate DDOS limits
		if (Jumbo.config.DOSPrevention && Jumbo.config.DOSPrevention.enabled === true)
		{
			this.requests.limitIP = Jumbo.config.DOSPrevention.maxRequestPerIP || this.requests.limitIP;
			this.requests.banTime = Jumbo.config.DOSPrevention.blockTime || this.requests.banTime;
		}
		else if (Jumbo.config.DOSPrevention && Jumbo.config.DOSPrevention.enabled === false)
		{
			this.requests.limitIP = 0;
		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Prepare options for HTTPS server
	 * @returns {Object}
	 */
	private prepareHttpsServerOptions()
	{
		let options: any = {};

		if (Jumbo.config.protocol.privateKey && Jumbo.config.protocol.certificate)
		{
			try
			{
				options.key = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.privateKey));
				options.cert = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.certificate));
			}
			catch (ex)
			{
				Log.error("Error ocurs while reading private key or certificate. " + ex.message);
				Application.exit();
				// return;
			}
		}
		else if (Jumbo.config.protocol.pfx)
		{
			try
			{
				options.pfx = $fs.readFileSync($path.resolve(Jumbo.BASE_DIR, Jumbo.config.protocol.pfx));
			}
			catch (ex)
			{
				Log.error("Error ocurs while reading pkcs archive. " + ex.message);
				Application.exit();
				// return;
			}
		}
		else
		{
			Log.error("You have not configured HTTPS server properly, key or certificate missing.");
			Application.exit();
			// return;
		}

		if (Jumbo.config.protocol.passphrase)
		{
			options.passphrase = Jumbo.config.protocol.passphrase;
		}
		return options;
	}

	//endregion

	//region Request process methods

	/**
	 * Server callback for http or https server
	 * Method accepting request from HTTP(S) server (or called from Tests)
	 * @param {$http.IncomingMessage} request
	 * @param {$http.ServerResponse} response
	 */
	private async serverCallback(request: $http.IncomingMessage, response: $http.ServerResponse)
	{
		// request start time
		let requestBeginTime = new Date().getTime();

		// X-Poweder-By
		response.setHeader("X-Powered-By", "JumboJS");

		// client IP from header
		let clientIP = this.getClientIP(request);

		try
		{
			// Check / process maximal request count
			let canContinue = this.checkRequestsLimit(response, clientIP);
			if (!canContinue) return;

			// Check / process maximal request count per IP
			canContinue = this.checkIPRequestsLimit(clientIP, response);
			if (!canContinue) return;

			// Check if url ends with delimiter - redirect to url without delimiter
			canContinue = this.checkEndingDelimiter(request, response);
			if (!canContinue) return;

			let aliasOrigUrl;
			if (!!(aliasOrigUrl = this.locator.getUrlForAlias(request.url)))
			{
				request.url = aliasOrigUrl;
			}

			// Check if request is requesting static file
			canContinue = await this.checkStaticFileRequest(request, response);
			if (!canContinue) return;

			await this.processRequest(request, response, requestBeginTime);
		}
		catch (ex)
		{
			// Just for case of some unexpected but catchable error
			await this.displayError(request, response, ex);
		}
	}

	/**
	 * Check if request is requesting static file
	 * @param request
	 * @param response
	 * @returns {boolean} True if workflow can continue or response has already been ended
	 */
	private async checkStaticFileRequest(request: $http.IncomingMessage, response: $http.ServerResponse): Promise<boolean>
	{
		if (request.method == "GET" && request.url.slice(0, 7) == "/public")
		{
			let url = decodeURI(request.url);

			return await new Promise<boolean>((resolve, reject) => {
				this.staticFileResolver($path.join(Jumbo.BASE_DIR, url), (error, fileStream, mime, size, headers) => {
					try
					{
						if (error)
						{
							this.displayError(request, response, {
								status: 404,
								message: "File '" + url + "' error. " + error.message
							});
							return resolve(false);
						}

						Log.line("Streaming static file '" + url + "'.", LogTypes.Http, LogLevels.Talkative);

						if (!headers || headers.constructor != Object)
						{
							headers = {
								"Content-Type": mime,
								"Content-Length": size,
								"Cache-Control": "public, max-age=43200" // 12h
							};
						}

						response.writeHead(200, headers);
						fileStream.pipe(response);
						return resolve(false);
					} catch (e) {
						reject(e);
					}
				});
			});
		}

		return true;
	}

	/**
	 * Check if url ends with delimiter - redirect to url without delimiter
	 * @param request
	 * @param response
	 * @returns {boolean} True if workflow can continue or response has already been ended
	 */
	private checkEndingDelimiter(request: $http.IncomingMessage, response: $http.ServerResponse): boolean
	{
		let urlWithoutEndingDelim;
		if (request.url.slice(-1) == (<any>this.locator).delimiter // test with regex only in case
			// that last char is delimiter (speed up);
			// regex will get url without delimiter although it looks like 'www.xxx.xx//////////////////'
			&& (urlWithoutEndingDelim = request.url.replace(END_DELIMITER_TRIM_REGEX, "")))
		{
			Log.line("Url ends with delimiter(s), redirecting to url without it.", LogTypes.Http, LogLevels.Talkative);
			this.redirectResponse(response, urlWithoutEndingDelim);
			return false;
		}

		return true;
	}

	/**
	 * Count IPs requests and check if limit was reached
	 * @param {string} clientIP
	 * @param response
	 * @returns {boolean} True if workflow can continue or response has already been ended
	 */
	private checkIPRequestsLimit(clientIP: any | number | string | string[], response: $http.ServerResponse): boolean
	{
		if (this.requests.limitIP != 0)
		{
			// If IP in ban list
			if (this.requests.blockedIPs[clientIP])
			{
				if (this.requests.blockedIPs[clientIP] <= new Date().getTime())
				{ // Ban ends
					delete this.requests.blockedIPs[clientIP];
				}
				else
				{
					this.plainResponse(response, "We're sorry but server reject your request.", 503);
					return false;
				}
			}

			if (!this.requests.countPerIP[clientIP])
			{
				this.requests.countPerIP[clientIP] = 1;
			}
			else
			{
				// Log in first case of overload
				if (++this.requests.countPerIP[clientIP] > this.requests.limitIP * CHECK_INTERVAL_TIME)
				{
					this.requests.blockedIPs[clientIP] = new Date().getTime() + this.requests.banTime * 1000;
					Log.warning("Client from ip " + clientIP
						+ " reached the ip/requests/sec limit and was blocked.", LogTypes.Http);

					// Send blocked IP to listener if registered
					if (this.blockIpListener != null)
					{
						this.blockIpListener(clientIP);
					}
				}
			}
		}

		return true;
	}

	/**
	 * Check / process maximal request count
	 * @param response
	 * @param {string} clientIP
	 * @returns {boolean} True if workflow can continue or response has already been ended
	 */
	private checkRequestsLimit(response, clientIP: string): boolean
	{
		if (this.requests.limit != 0)
		{
			if (++this.requests.totalCount > this.requests.limit * CHECK_INTERVAL_TIME)
			{
				this.plainResponse(response, "We're sorry but server reject your request because of overload.", 503);

				// Log in first case of overload
				if (this.requests.totalCount == (this.requests.limit + 1))
				{
					Log.warning("Limit of request per second was reached. Last request come from: "
						+ clientIP, LogTypes.Http, LogLevels.Talkative);
				}

				return false;
			}
		}

		return true;
	}

	/**
	 * Process incoming request
	 * @private
	 * @param request
	 * @param response
	 * @param requestBeginTime
	 * @returns {*}
	 */
	private async processRequest(request, response, requestBeginTime)
	{
		const jResponse = new Response(response); // Build response

		let match: ILocatorMatch = <any>this.locator.parseUrl(request); // Match URL in Locator
		if (!match || match.constructor != Object)
		{
			return this.procUrlParseError(match, request, response, jResponse);
		}

		const jRequest = this.buildRequest(request, requestBeginTime, match); // Build request

		// Check if URL is not in long format, if so, redirect to short format URL
		let redirectTo = this.checkLongFormatUrl(jRequest, match);
		if (redirectTo) return jResponse.redirectUrl(redirectTo);

		this.setClientSession(jRequest, jResponse);
		jRequest.body = await this.collectBodyData(jRequest, jResponse);

		if (DEBUG_MODE)
		{
			console.log(`[DEBUG] Request target point Sub-App ${jRequest.subApp}, Controller ${jRequest.controllerFullName}, `
				+ `Action ${jRequest.actionFullName}, Method ${jRequest.method}`);
		}

		// Create controller
		let ctrl = await this.createController(jRequest, jResponse);

		// Call beforeActions
		let actionResult = await this.callBeforeActions(ctrl, jRequest);
		if (actionResult !== undefined) await this.afterAction(ctrl, actionResult); // Call afterAction if some value was returned

		if (!response.finished && !ctrl.exited) // beforeAction returned undefined and response not finished
		{
			// Call action
			actionResult = await this.callAction(ctrl, jRequest);
			if (actionResult !== undefined) await this.afterAction(ctrl, actionResult);
		}

		// Save session, only if some data exists in session
		this.storeSession(ctrl, jRequest);

		if (LOG_ENABLED)
		{
			Log.line(request.method.toUpperCase() + " " + (jRequest.noCache ? "no-cached " : "")
				+ request.headers.host + request.url + ` (${jRequest.subApp} subapp)`
				+ ` returned in ${new Date().getTime() - jRequest.beginTime} ms`);
		}

		if (ctrl.exited) return;

		// Just for case that somebody called exit() but response wasn't sent
		if (!response.finished)
		{
			response.end();
		}

		// if exit() wasn't called
		throw new Error(`Action '${jRequest.actionFullName}'`
			+ ` in controller '${jRequest.controllerFullName}' wasn't exited.`);
	}

	/**
	 * Process parseUrl error
	 * @param {ILocatorMatch} match
	 * @param {"http".IncomingMessage} request
	 * @param {"http".ServerResponse} response
	 * @param {Response} jResponse
	 */
	private async procUrlParseError(match: ILocatorMatch, request: $http.IncomingMessage,
		response: $http.ServerResponse, jResponse: Response): Promise<void>
	{
		if (match == null || !(<RequestException><any>match).redirectTo)
		{
			return this.displayError(request, response, {
				status: 404,
				message: `Page not found. Requested URL '${request.url}'`
			})
		}

		return jResponse.redirectUrl(
			(<RequestException><any>match).redirectTo,
			(<RequestException><any>match).statusCode
		);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Set session id to response if no session exists already.
	 * @param {Request} jRequest
	 * @param {Response} jResponse
	 */
	private setClientSession(jRequest: Request, jResponse: Response)
	{
		if (!(jRequest.sessionId = jRequest.getCookie(Jumbo.config.session.sessionsCookieName)))
		{
			jRequest.sessionId = uuid();
			jResponse.setCookie(Jumbo.config.session.sessionsCookieName, jRequest.sessionId, null, null, "/");
		}
	}

	/**
	 * Return session object
	 * @param {Request} jRequest
	 * @returns {{}}
	 */
	private async getClientSession(jRequest: Request): Promise<{ [key: string]: any } | undefined>
	{
		// Try to get in-memory session
		let session = this.sessions[jRequest.sessionId];

		if (session != undefined)
		{
			return session;
		}

		// if session in not in memory, try to load session from file

		// If session is justInMemory, ignore drive and return
		if (Jumbo.config.session.justInMemory === true)
		{
			return undefined;
		}

		return await new Promise<{ [key: string]: any }>(resolve => {
			$fs.readFile($path.join(Jumbo.SESSION_DIR, jRequest.sessionId + ".session"), "utf-8", (err, sessJson) => {
				if (!err)
				{
					try
					{
						resolve(JSON.parse(sessJson));
					}
					catch (e)
					{
					}
				}

				resolve(undefined);
			});
		});
	}

	/**
	 * Create Request
	 * @param {$http.IncomingMessage} request
	 * @param {number} requestBeginTime
	 * @param {ILocatorMatch} match
	 * @returns {Request}
	 * @throws {Error} Will be thrown if target point doesn't exist or if URL has bad format
	 */
	private buildRequest(request: $http.IncomingMessage, requestBeginTime: number, match: ILocatorMatch): Request
	{
		// Verify that target location exists and get its full names
		let target = this.controllerFactory.getTargetPoint(match.subApp, match.controller,
			match.action, request.method);

		let req = new Request(request);
		req._bindLocation(match.location, target.subApp, target.controller, target.action, match.params);

		req.beginTime = requestBeginTime;
		req.locale = match.locale;

		return req;
	}

	/**
	 * Check if given URL is long format URL, eg. "/home/index" should be redirected to "/"
	 * @param {Request} req
	 * @param {ILocatorMatch} match
	 * @returns {string | null}
	 */
	private checkLongFormatUrl(req: Request, match: ILocatorMatch): string | null
	{
		let url = req.request.url;
		let delimiter = (<any>this.locator).delimiter;

		if (match.controllerInUrl && req.action == DEFAULT_ACTION)
		{
			let query = $url.parse(url).query || "";
			if (query) query = "?" + query;
			let redirTo = ""; // just '/'

			if (req.controller != DEFAULT_CONTROLLER)
			{
				redirTo = req.controller; // '/controller'
			}

			if (GLOBALIZATION_ENABLED)
			{
				redirTo = req.locale + (redirTo ? delimiter : "") + redirTo;
			}

			return "/" + redirTo + query;
		}

		return null;
	}

	/**
	 * Process POST request, get data and files
	 * @private
	 * @param {Request} req
	 * @param {Response} res
	 */
	private async collectBodyData(req: Request, res: Response): Promise<IBody>
	{
		let end = false;

		let form = new $formidable.IncomingForm();
		form.uploadDir = Jumbo.UPLOAD_DIR;
		form.keepExtensions = true;

		return await new Promise<IBody>((resolve, reject) => {
			// check for max file size limit
			form.on("progress", async () => {
				try
				{
					if (form.bytesExpected > MAX_POST_DATA_SIZE)
					{
						end = true;
						form.emit("error", "The post data received is too big");
						await this.displayError(req.request, res.response, {
							status: 413,
							message: "The post data received is too big"
						});
						req.request.connection.destroy();
					}
				} catch (e) {
					reject(e);
				}
			});

			// get data - parse
			form.parse(req.request, (err, fields, files) => {
				if (end)
				{
					return;
				}

				if (err)
				{
					reject(err);
				}
				else
				{
					resolve({fields: fields, files: files});
				}
			});
		});
	}

	/**
	 * Create controller and init it
	 * @param {Request} request
	 * @param {Response} response
	 * @returns {Promise<Controller>}
	 */
	private async createController(request: Request, response: Response): Promise<Controller>
	{
		// new scope for controller
		let scope = new Jumbo.Ioc.Scope();

		// create controller
		let ctrl = this.controllerFactory.createController(
			this.controllerFactory.getControllerId(request.controller),
			this.controllerFactory.getSubAppId(request.subApp),
			scope
		);

		let session = await this.getClientSession(request);
		this.initController(ctrl, request, response, session, scope);

		return ctrl;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Initialize controller and init action call
	 * @param {Request} req
	 * @param {Controller} cntrll
	 * @param {Response} res
	 * @param {Object} session
	 * @param {Scope} scope
	 */
	private initController(cntrll: Controller, req: Request, res: Response, session: { [key: string]: any }, scope: Scope)
	{
		// Init controller
		cntrll._initController(req, res, session, scope);

		if (req.body != null)
		{
			// TODO: Process POST, reconstruct model and validate it

		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Call beforeActions method if exists
	 * @param {Request} request
	 * @param {Controller} ctrl
	 * @returns {object} Returns action return value or undefined
	 */
	private async callBeforeActions(ctrl: Controller, request: Request): Promise<any>
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.callBeforeActions() called");
		}

		let beforeActionsResult;
		let result;
		let cntrlParent = Object.getPrototypeOf(ctrl.constructor); // will return Parent class

		if (cntrlParent.prototype[BEFORE_ACTION_NAME])
		{
			beforeActionsResult = cntrlParent.prototype[BEFORE_ACTION_NAME].call(ctrl);
			if (beforeActionsResult.constructor != Promise)
			{
				throw new Error(`Action 'beforeActions' in ${cntrlParent.name} `
					+ "is not async method (does not return Promise).");
			}
			result = await beforeActionsResult;
			if (result != undefined) return result;
		}

		if (ctrl[BEFORE_ACTION_NAME])
		{
			beforeActionsResult = ctrl[BEFORE_ACTION_NAME]();
			if (beforeActionsResult.constructor != Promise)
			{
				throw new Error(`Action 'beforeActions' in ${ctrl.constructor.name} `
					+ "is not async method (does not return Promise).");
			}
			result = await beforeActionsResult;
			if (result != undefined) return result;
		}
	}

	/**
	 * Call action request, build parameters to by method requested order
	 * @param {Controller} controller
	 * @param {Request} request
	 * @returns {object} Returns action return value or undefined
	 */
	private async callAction(controller: Controller, request: Request): Promise<any>
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.callAction() called");
		}

		let action = controller[request.actionFullName];

		if (action) // Just for sure but false should be never returned
		{
			let controllerId = request.controllerFullName.toLowerCase();
			let actionId = request.actionFullName.toLowerCase();
			let subAppId = request.subApp.toLowerCase();
			let actionParams = this.controllerFactory.getActionInfo(actionId, controllerId, subAppId).params;
			let args = [];

			for (let param of actionParams)
			{
				args.push(request.params[param] || undefined);
			}

			let rtrnVal = action.apply(controller, args);

			if (rtrnVal.constructor != Promise)
			{
				throw new Error(`Action '${request.actionFullName}' in controller `
					+ request.controllerFullName + " is not async method (does not return Promise)");
			}

			return await rtrnVal;
		}
	}

	/**
	 * After action procedure which should process result and send resposne to client
	 * @param {Controller} controller
	 * @param actionResult
	 */
	private async afterAction(controller: Controller, actionResult: ViewResult)
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.afterAction() called");
		}

		let req = controller.request;
		let res = controller.response;

		// if null returned, empty result is required
		if (actionResult === null)
		{
			return res.response.end("");
		}

		// if (actionResult instanceof Error || actionResult instanceof Exception) // Error can be returned too
		// {
		// 	return this.displayError(request, response, actionResult);
		// }

		if (actionResult.constructor == ViewResult) // actionResult.constructor == ViewResult should be 6x faster but it returns FALSE sometimes, WTF?
		{
			actionResult.data.lang = controller.request.locale.slice(0, 2);
			actionResult.data._context = actionResult;
			actionResult.messages = actionResult.data.clientMessages = (controller.crossRequestData[CLIENT_MESSAGE_ID] || {});
			actionResult.locale = controller.request.locale;

			await this.prepareView(controller, req, res, actionResult);

			if (JUMBO_DEBUG_MODE)
			{
				console.log("[DEBUG] Application.afterAction() after prepareView call");
			}
		}
		else
		{
			throw new Error(`Unexpected return value of action '${req.actionFullName}'`
				+ ` in controller '${req.controllerFullName}' or action wasn't exited.`);
		}
	}

	/**
	 * Wil store session
	 * @param {Controller} cntrll
	 * @param {Request} req
	 */
	private storeSession(cntrll: Controller, req: Request)
	{
		if (cntrll.session && Object.keys(cntrll.session).length != 0)
		{
			// To memory
			this.sessions[req.sessionId] = cntrll.session;

			if (Jumbo.config.session.justInMemory !== true)
			{
				// To disk
				$fs.writeFile(
					$path.join(Jumbo.SESSION_DIR, req.sessionId + ".session"),
					JSON.stringify(cntrll.session),
					"utf-8",
					() => {
					} // empty callback
				);
			}
		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Create name for template cache file
	 * @param viewResult
	 * @param req
	 * @returns {String}
	 */
	private getTemplateCacheName(viewResult: ViewResult, req)
	{
		let tplCacheFileName = (req.subApp || "Default") + "-";

		if (viewResult.view)
		{
			tplCacheFileName += viewResult.view.replace(/[^\w\\\/]/g, "").replace(/[\/\\]/g, "-");

			if (viewResult.partialView)
			{ // snippetView is partialView too
				tplCacheFileName += "_single-template";
			}
		}
		else
		{
			tplCacheFileName += req.controller + "-" + req.action;
		}

		tplCacheFileName += TPL_CACHE_EXTENSION;

		return $path.join(Jumbo.CACHE_DIR, tplCacheFileName);
	}

	/**
	 * Prepare view rendering
	 * @param {Controller} controller
	 * @param {Request} req
	 * @param res
	 * @param viewResult
	 */
	private async prepareView(controller: Controller, req: Request, res: Response, viewResult: ViewResult)
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.prepareView() called");
		}

		if (!viewResult.view)
		{
			viewResult.view = req.controller + "/" + req.action;
		}

		let tplCacheFile = this.getTemplateCacheName(viewResult, req);

		// If RAW template file required, it's not important to cache this templates
		// because raw templates should be required with SPAs, which store it locally
		// so only one request will be made per client
		if (viewResult.rawTemplate)
		{
			return await new Promise((resolve, reject) => {
				$fs.readFile(tplCacheFile, "utf-8", (err, content) => {
					if (err)
					{
						return reject(err);
					}

					try
					{
						this.sendView(content, res, controller);
						resolve();
					} catch (e) {
						reject(e);
					}
				});
			});
		}

		// Do complete (compile and) render
		if (req.noCache || !CAN_USE_CACHE)
		{
			return await this.compileAndRenderView(viewResult, req, res, controller, CAN_USE_CACHE, tplCacheFile);
		}

		// templateAdapter contain preCompilation, no noCache header in request and cache is enabled

		// Cached in memory
		if (this.memoryCacheQueue.indexOf(tplCacheFile) != -1)
		{
			let tpl = await this.templateAdapter.renderPreCompiled(this.memoryCache[tplCacheFile], viewResult.data, controller);
			return this.sendView(tpl, res, controller);
		}

		if (DEBUG_MODE)
		{
			console.log("[DEBUG] Reading template from cache file");
		}

		return await new Promise((resolve, reject) => {
			$fs.readFile(tplCacheFile, "utf-8", async (err, content) => {
				try
				{
					if (err)
					{ // No cache exists - do complete (compile and) render
						await this.compileAndRenderView(viewResult, req, res, controller, true, tplCacheFile);
						return resolve();
					}

					let tpl = await this.templateAdapter.renderPreCompiled(content, viewResult.data, controller);
					this.sendView(tpl, res, controller);
					resolve();
				}
				catch (e)
				{
					reject(e);
				}
			});
		});
	}

	/**
	 * Send view to client
	 * @param {string} output
	 * @param {Response} res
	 * @param {Controller} ctrl
	 */
	private sendView(output: string, res: Response, ctrl: Controller)
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.sendView() called");
		}

		let response = res.response;

		res.headers["Content-Length"] = Buffer.byteLength(output, "utf-8");
		response.writeHead(200, res.headers);
		response.end(output);

		this.afterTemplateRender(ctrl);
	}

	/**
	 * New complete (compile and) render of view
	 * @param {ViewResult} viewResult
	 * @param {Request} req
	 * @param {Response} res
	 * @param {Controller} cntrl
	 * @param {boolean} writeToCache
	 * @param {string} tplCacheFileName
	 */
	private async compileAndRenderView(viewResult: ViewResult, req: Request, res: Response,
		cntrl: Controller, writeToCache: boolean, tplCacheFileName: string)
	{
		if (JUMBO_DEBUG_MODE)
		{
			console.log("[DEBUG] Application.renderView() called");
		}

		let {templatePath, layoutPath, dynamicLayout} = this.prepareRenderViewProperties(req, viewResult);

		// templateAdapter has preCompilation and cache is enabled => preCompile template and save it to cache
		if (writeToCache)
		{
			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Precompiling template");
			}

			let compiledtemplate = await this.templateAdapter.preCompile(templatePath, layoutPath, dynamicLayout);
			this.cacheViewTemplate(tplCacheFileName, compiledtemplate);

			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Rendering template");
			}

			let tpl = await this.templateAdapter.renderPreCompiled(compiledtemplate, viewResult.data, cntrl);
			this.sendView(tpl, res, cntrl);
		}
		else
		{
			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Complete (compile and) render");
			}

			// Do complete (compile and) render
			let tpl = await this.templateAdapter.render(templatePath, layoutPath, dynamicLayout, viewResult.data, cntrl);
			this.sendView(tpl, res, cntrl);
		}
	}

	/**
	 * Prepare properties for template rendering
	 * @param {Request} req
	 * @param {ViewResult} viewResult
	 * @return {{templatePath: string, layoutPath: string | null, dynamicLayout: string | null}}
	 */
	private prepareRenderViewProperties(req: Request, viewResult: ViewResult)
	{
		let appPath = Jumbo.APP_DIR;

		if (req.subApp != MAIN_SUBAPP_NAME)
		{
			appPath = $path.join(Jumbo.APP_DIR, "sub-apps", this.controllerFactory.getSubAppInfo(req.subApp).dir);
		}

		let templatePath = $path.join(appPath, "templates", viewResult.view + this.templateAdapter.extension);
		let layoutPath: string | null = null;
		let dynamicLayout: string | null = null;

		if (viewResult.snippet)
		{
			dynamicLayout = '{include ' + viewResult.snippet + '}';

			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Rendering snippet ", viewResult.snippet, "of", templatePath);
			}
		}
		else if (viewResult.partialView)
		{
			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Rendering partial template ", templatePath);
			}
		}
		else
		{
			layoutPath = $path.join(appPath, "templates", "layout" + this.templateAdapter.extension);

			if (DEBUG_MODE)
			{
				console.log("[DEBUG] Rendering template '", templatePath, "' with layout", layoutPath);
			}
		}

		return {templatePath, layoutPath, dynamicLayout};
	}

	/**
	 * Store compiled template in cache
	 * @param tplCacheFile
	 * @param {string} compiledtemplate
	 */
	private cacheViewTemplate(tplCacheFile, compiledtemplate: string)
	{
		// Buffer.byteLength() should be used but .length on string is faster
		// and diff in size shouldn't be big. Maybe if template will be full of >= 2B unicode characters
		// then should be difference big(2x bigger or a little bit more)
		// Buffer.byteLength() is 30 times slower
		// Maybe logic of storing templates should be changed. Now last requested template is added to
		// memory, but it should be better to track number of request for which template and keep the
		// most requested templates

		// If stored -> remove
		if (this.memoryCache[tplCacheFile])
		{
			this.memoryCacheSize -= this.memoryCache[tplCacheFile].length; // <- Buffer.byteLength
			delete this.memoryCache[tplCacheFile];
		}

		let size = compiledtemplate.length; // <- Buffer.byteLength  // If file can be saved to memory cache (fit limit)

		if (size < Jumbo.config.cache.memoryCacheSizeLimit)
		{
			// clear old templates from memory cache and allow new template to save
			while (this.memoryCacheSize + size > Jumbo.config.cache.memoryCacheSizeLimit)
			{
				let item = this.memoryCacheQueue.shift();
				this.memoryCacheSize -= this.memoryCache[item].length; // <- Buffer.byteLength
				delete this.memoryCache[item];
			}
			this.memoryCache[tplCacheFile] = compiledtemplate;
			this.memoryCacheSize += size;
			this.memoryCacheQueue.push(tplCacheFile);
		}

		// Write to file
		$fs.writeFile(tplCacheFile, compiledtemplate, () => { });
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Called after template render * @param cntrl
	 */
	private afterTemplateRender(ctrl: Controller)
	{
		// Delete cross request data from controller
		ctrl._clearOldCrossRequestData();

		// Exit
		ctrl.exit();
	}

	//endregion

	//region Helping methods

	// noinspection JSMethodCanBeStatic
	/**
	 * End request as plain/text with content length header
	 * @param response
	 * @param message
	 * @param code
	 */
	private plainResponse(response, message, code)
	{
		response.writeHead(code, {
			"Content-Type": "text/plain",
			"Content-Length": Buffer.byteLength(message, "utf-8")
		});
		response.end(message);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Redirect to given URL
	 * @param response
	 * @param {string} url
	 * @param {number} statusCode
	 */
	private redirectResponse(response, url, statusCode = 302)
	{
		response.writeHead(statusCode, {"Location": url});
		response.end();
	}

	/**
	 * Return error page to client; try to find <errCode>.html in data/errors
	 * @param request
	 * @param response
	 * @param {{status: Number, message: String, error: Error} | Error | Exception} errObj
	 */
	private async displayError(request: $http.IncomingMessage, response: $http.ServerResponse, errObj)
	{
		let ex = errObj.error || errObj;
		let errorObj = {
			message: errObj.message || ex.message,
			status: errObj.status || 500,
			stack: ex.stack
		};

		Log.warning("Error while serving " + request.url + "; Client " + this.getClientIP(request) + "; "
			+ errorObj.stack, LogTypes.Http
		);

		if (response.finished) return;

		if (DEVELOPMENT_MODE && ex instanceof Error || ex instanceof Exception)
		{
			return this.renderException(errorObj.message || ex.message, ex, errorObj.status || 500, request, response);
		}

		let errFile = $path.resolve(Jumbo.ERR_DIR, errorObj.status + ".html");
		let errExists = await new Promise(resolve => {
			$fs.access(errFile, $fs.constants.R_OK, err => {
				resolve(!err);
			});
		});

		if (errExists)
		{
			this.staticFileResolver(errFile, (error, fileStream, mime, size) => {
				if (error)
				{
					Log.error("Applicaton.displayError(): " + error.message);
					return this.plainResponse(response, "Internal server error.", 500);
				}

				response.writeHead(errorObj.status, {"Content-Type": "text/html", "Content-Length": size});
				fileStream.pipe(response);
			});
		}
		else
		{
			try
			{
				this.plainResponse(response, errorObj.status, "Status code " + errorObj.status + "\nWe're sorry but some error occurs.");
			}
			catch (ex)
			{
				Log.error(ex.message, LogTypes.Std);
			}
		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Will return styled page with error info.
	 * @param {string} message
	 * @param {Error|Exception} ex
	 * @param {number} status
	 * @param {"http".IncomingMessage} request
	 * @param {"http".ServerResponse} response
	 */
	private renderException(message: string, ex: Error | Exception, status: number, request: $http.IncomingMessage,
		response: $http.ServerResponse)
	{
		let result = require("jumbo-core/exception-template.js")(message, ex, status, request);
		response.writeHead(status, {
			"Content-Type": "text/html",
			"Content-Length": Buffer.byteLength(result, "utf-8")
		});
		response.end(result);
	}

	//endregion

	//endregion
}

/**
 * Activator used for creating instance
 */
class ApplicationActivator extends Application
{
}

// Must be here at bottom cuz of cycle dependencies
import {
	Locator, END_DELIMITER_TRIM_REGEX, DEFAULT_ACTION, DEFAULT_CONTROLLER
} from "jumbo-core/application/Locator";
import {ControllerFactory, MAIN_SUBAPP_NAME} from "jumbo-core/application/ControllerFactory";
import {DIContainer} from "jumbo-core/ioc/DIContainer";
import {Log, LogTypes, LogLevels} from "jumbo-core/logging/Log";
import {Response} from "jumbo-core/application/Response";
import {Request} from "jumbo-core/application/Request";
import {RequestException} from "jumbo-core/exceptions/RequestException";
import {Controller} from "jumbo-core/base/Controller";
import {Scope} from "jumbo-core/ioc/Scope";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Application END");
}