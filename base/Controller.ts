/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {ErrorResult} from "../results/ErrorResult";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Controller");
}

let $fs, $path, fileExtensionToMimeMap;// Will be initiated when required
let crossRequestDataStorage: { [key: string]: any } = {};// Cross request storage
const XJUMBO_REQUEST_ACTION_MAP = { // Object mapping x-jumbo-request types to controller actions
	"text/html": function (ctrl: Controller, viewOrData, data = null) {
		return (<any>ctrl).partialView(viewOrData, data);
	},
	"text/template": function (ctrl: Controller, view) {
		return (<any>ctrl).template(typeof view == "string" ? view : null);
	},
	"application/json": function (ctrl: Controller, viewOrData, data = null) {
		return (<any>ctrl).json(data || viewOrData || {});
	},
};
const X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME = "x-required-content-type"; // Name of HTTP header property which should tells
// which view type is required

/**
 * Core controller of framework
 * @memberOf Jumbo.Base
 */
export class Controller
{

	//region Fields

	/**
	 * Incoming request
	 */
	request: Request;

	/**
	 * Server response
	 */
	response: Response;

	/**
	 * Session object; You can use it for whatever you want.
	 * @description All data stored here are specific for one client and all data are accessible through all client's
	 *     requests.
	 */
	session: { [key: string]: any } = {};

	/**
	 * Controller scope of DI
	 * @type {Scope}
	 */
	scope: Scope = null;

	/**
	 * @private
	 * @ignore
	 * @type {boolean}
	 */
	exited = false;

	/**
	 * Data stored to next request
	 * @description Data stored in this object will be cleared after view render. It can hold data eg. 10 requests.
	 * @type {{}}
	 */
	crossRequestData: any = null;

	//endregion

	//region Properties

	/**
	 * ID for block with client messages
	 */
	static clientMessagesId: string = "_clientMessages";

	/**
	 * Getter for URL builder
	 * @type Url
	 */
	protected get url(): Url
	{
		return new Jumbo.Utils.Url(this.request);
	}

	/**
	 * Get CSRF token for FORM
	 * @returns {string}
	 */
	public get csrfToken(): string
	{
		return Application.instance.generateCsrfTokenFor(
			Application.instance.getCsrfSecret(this.session)
		);
	}

	//endregion

	// //region Ctors
	//
	// constructor() {
	//
	// }
	//
	// //endregion

	//region Private methods

	// noinspection JSUnusedLocalSymbols
	/**
	 * @private
	 * @ignore
	 * @param {Request} request
	 * @param {Response} response
	 * @param {{}} session
	 * @param {Scope} scope
	 */
	_initController(request: Request, response: Response, session: { [key: string]: any }, scope: Scope)
	{
		this.session = session;
		this.request = request;
		this.response = response;
		this.scope = scope;

		this.crossRequestData = {};
		/*new Proxy({}, {
					get: function (obj, key) {
						if (!crossRequestDataStorage.hasOwnProperty(request.sessionId))
						{
							return undefined;
						}

						return crossRequestDataStorage[request.sessionId][key];
					},
					set: function (obj, key, value) {
						if (!crossRequestDataStorage.hasOwnProperty(request.sessionId))
						{
							crossRequestDataStorage[request.sessionId] = {};
						}

						return crossRequestDataStorage[request.sessionId][key] = value;
					},
					getOwnPropertyDescriptor: function (obj, key) {
						if (!crossRequestDataStorage.hasOwnProperty(request.sessionId))
						{
							return undefined;
						}

						return Object.getOwnPropertyDescriptor(crossRequestDataStorage[request.sessionId], key);
					}
				});*/
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Clear all old cross request data which already lived cross two requests
	 * @private
	 * @ignore
	 */
	_clearOldCrossRequestData()
	{
		if (!crossRequestDataStorage.hasOwnProperty(this.request.sessionId))
		{
			return;
		}

		delete crossRequestDataStorage[this.request.sessionId];
	}

	/**
	 * Create ViewResult
	 * @param viewOrData
	 * @param data
	 * @return {ViewResult}
	 */
	protected static createBaseViewResult(viewOrData: string | {}, data: {})
	{
		if (typeof viewOrData == "string")
		{
			return new ViewResult(viewOrData, data || {});
		}

		return new ViewResult(null, viewOrData || {});
	}

	//endregion

	//region Public methods

	/**
	 * Generate new CSRF token. Do it at least after login!
	 */
	async regenerateCsrfSecret()
	{
		await Application.instance.generateCsrfSecret(this.session);
	}

	/**
	 * Completly ends basic workflow. Call it if you processed request/response on your own.
	 */
	exit()
	{
		this.exited = true;

		// If response wasn't sent
		if (!this.response.response.finished)
		{
			this.response.response.end();
		}
	}

	/**
	 * Add message to data for view, allow rendering messaes for clients.
	 * Messages are hold in cookie for next request or to time of first reading.
	 * @param {String} message
	 * @param {String} [messageType]
	 */
	addMessage(message: string, messageType)
	{
		if (!crossRequestDataStorage.hasOwnProperty(this.request.sessionId)
			|| !crossRequestDataStorage[this.request.sessionId].hasOwnProperty(Controller.clientMessagesId))
		{
			this.crossRequestData[Controller.clientMessagesId] = [];
		}

		crossRequestDataStorage[this.request.sessionId][Controller.clientMessagesId]
			.push({message: message, type: messageType});
	}

	//region Results

	/**
	 * Ends request and return default or given view with given data
	 * @param {String | Object} [viewOrData] Name of specific view or just data
	 * if your wanted view is default (if match with action name)
	 * @param {Object} [data] Data object
	 * @returns {ViewResult}
	 */
	protected renderView(viewOrData, data = null): ViewResult
	{
		return Controller.createBaseViewResult(viewOrData, data);
	}

	/**
	 * Ends request and return single view without layout.
	 * Template mush have own output, no block is used from ouside template.
	 * @param {String} [partialViewOrData] Name of specific view or data object
	 * @param {Object} [data] Data object
	 */
	protected partialView(partialViewOrData = null, data = null): ViewResult
	{
		let res = Controller.createBaseViewResult(partialViewOrData, data);
		res.partialView = true;
		return res;
	}

	/**
	 * Return raw template without rendering
	 * @param view
	 */
	protected template(view = null): ViewResult
	{
		let res = Controller.createBaseViewResult(view, undefined);
		res.rawTemplate = true;
		return res;
	}

	/**
	 * Return view or specific required type if request is XHR with special header.
	 * It return full rendered view, rendered content view, raw template or just JSON data for given template.
	 * @param {String | Object} viewOrData
	 * @param {Object} [data]
	 */
	protected view(viewOrData, data = null): ViewResult
	{
		let reqTypeHeader: string = <string>this.request.request.headers[X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME];

		if (reqTypeHeader/* && this.request.isXhr()*/)
		{
			let action = XJUMBO_REQUEST_ACTION_MAP[reqTypeHeader];

			if (action)
			{
				this.response.headers["Vary"] = X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME;
				return action(this, viewOrData, data);
			}
		}

		return this.renderView(viewOrData, data);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Ends request and return default or given view with given data but without layout
	 * @param {String | Object} [viewOrData] Name of specific view or just data
	 * if your wanted view is default (if match with action name)
	 * @param {Object} [dataOrSnippetName] Data object or snppet name if first param contains data
	 * @param {string} [snippetName] Name of BLOCK which will be returned to client
	 */
	protected snippetView(viewOrData, dataOrSnippetName = null, snippetName = "content"): ViewResult
	{
		let res;

		if (typeof viewOrData == "string")
		{
			res = new ViewResult(viewOrData, dataOrSnippetName.constructor == Object ? dataOrSnippetName : {});
		}
		else
		{
			res = new ViewResult(null, viewOrData.constructor == Object ? viewOrData : {});
		}

		res.snippet = snippetName;
		res.partialView = true;

		return res;
	}

	/**
	 * Ends request with result of given data and type
	 * @param data
	 * @param {String} [type] Content-type
	 */
	public data(data, type = "text/plain")
	{
		if (type && type.trim().length != 0)
		{
			this.response.headers["Content-Type"] = type;
		}

		this.response.headers["Content-Length"] = Buffer.byteLength(data, "utf-8");

		this.response.response.writeHead(200, this.response.headers);
		this.response.response.end(data);
		this.exit();
	}

	/**
	 * Ends request with JSON result
	 * @param {Object} jsonObj
	 */
	public json(jsonObj)
	{
		this.data(JSON.stringify(jsonObj), "application/json");
		this.exit();
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Ends request with error result. HTML file in /data/errors with given statusCode will be sent to client.
	 * If file not exists, plain text message "We're sorry but some error occurs." will be shown.
	 * @param {String} message Message which will be logged, it will not be displayd to client
	 * @param [statusCode] default 500
	 * @param {Error} error
	 */
	protected error(message, statusCode = 500, error = undefined): ErrorResult
	{
		return new ErrorResult(message, statusCode, error);
	}

	/**
	 * Sends file to client for download
	 * @param {String} filePath
	 * @param {String} [newName]
	 * @param contentType
	 */
	protected fileDownload(filePath, newName, contentType)
	{
		this.exited = true; // this.exit() not called cuz it ends reponse; it cannot be called in the end of this method because it's async and Application needs to know this in sync time

		// Require fs if it hasn't been required yet
		if (!$fs)
		{
			$fs = require("fs");
		}

		// Require path if it hasn't been required yet
		if (!$path)
		{
			$path = require("path");
		}

		if (!contentType && !fileExtensionToMimeMap)
		{
			fileExtensionToMimeMap = require("jumbo-core/utils/file-extension-to-mime-map");
		}

		$fs.lstat(filePath, (error, stats) => {
			if (error || !stats || !stats.isFile())
			{
				return this.error(`File '${filePath}' given for download is not valid file.`, 404);
			}

			if (!newName)
			{
				newName = $path.parse(filePath).base;
			}

			let mime = contentType || fileExtensionToMimeMap[$path.extname(filePath).slice(1)];

			this.response.headers["Content-Disposition"] = "attachment; filename=" + newName;
			this.response.headers["Content-Type"] = mime;
			this.response.headers["Content-Type"] = stats.size;

			this.response.response.writeHead(200, this.response.headers);

			$fs.createReadStream(filePath).pipe(this.response.response);
		});
	}

	/**
	 * Redirect client to given URL
	 * @param {Url} url
	 */
	protected redirect(url: Url)
	{
		this.response.redirectUrl(url.getUrl());
		this.exit();
	}

	//endregion

	//endregion
}

import {Url} from "jumbo-core/utils/Url";
import {Request} from "jumbo-core/application/Request";
import {Response} from "jumbo-core/application/Response";
import {Scope} from "jumbo-core/ioc/Scope";
import {ViewResult} from "jumbo-core/results/ViewResult";
import {Application, CSRF_KEY_NAME} from "../application/Application";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Controller END");
}