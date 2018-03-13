/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {Locator} from "jumbo-core/application/Locator";
import {Url} from "jumbo-core/utils/Url";
import {Request} from "jumbo-core/application/Request";
import {Response} from "jumbo-core/application/Response";
import {Scope} from "jumbo-core/ioc/Scope";
import {ViewResult} from "../results/ViewResult";


let $fs, $path, fileExtensionToMimeMap;// Will be initiated when required
let crossRequestDataStorage: { [key: string]: any } = {};// Cross request storage
const locator: Locator = Locator.instance;
const XJUMBO_REQUEST_ACTION_MAP = { // Object mapping x-jumbo-request types to controller actions
	"contentView": function (ctrl: Controller, viewOrData, data = null) {
		return ctrl.partialView(viewOrData, data);
	},
	"template": function (ctrl: Controller, view) {
		return ctrl.template(typeof view == "string" ? view : null);
	},
	"viewData": function (ctrl: Controller, viewOrData, data = null) {
		return ctrl.json(data || viewOrData || {});
	},
};
const X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME = "x-jumbo-requested-view"; // Name of HTTP header property which should tells
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
	 * @type {Proxy}
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
		return new Url(this.request);
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

		this.crossRequestData = new Proxy({}, {
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
		});
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
	protected createBaseViewResult(viewOrData: string | {}, data: {})
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
	renderView(viewOrData, data = null): ViewResult
	{
		return this.createBaseViewResult(viewOrData, data);
	}

	/**
	 * Ends request and return single view without layout.
	 * Template mush have own output, no block is used from ouside template.
	 * @param {String} [partialViewOrData] Name of specific view or data object
	 * @param {Object} [data] Data object
	 */
	partialView(partialViewOrData = null, data = null): ViewResult
	{
		let res = this.createBaseViewResult(partialViewOrData, data);
		res.partialView = true;
		return res;
	}

	/**
	 * Return raw template without rendering
	 * @param view
	 */
	template(view = null): ViewResult
	{
		let res = this.createBaseViewResult(view, undefined);
		res.rawTemplate = true;
		return res;
	}

	/**
	 * Return view or specific required type if request is XHR with special header.
	 * It return full rendered view, rendered content view, raw template or just JSON data for given template.
	 * @param {String | Object} viewOrData
	 * @param {Object} [data]
	 */
	view(viewOrData, data = null): ViewResult
	{
		if (this.request.isXhr())
		{
			let action = XJUMBO_REQUEST_ACTION_MAP[<string>this.request.request.headers[X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME]];

			if (action)
			{
				return action(this, viewOrData, data);
			}
		}

		return this.renderView(viewOrData, data);
	}

	//
	// /**
	//  * Ends request and return default or given view with given data but without layout
	//  * @param {String | Object} [viewOrData] Name of specific view or just data
	//  * if your wanted view is default (if match with action name)
	//  * @param {Object} [dataOrSnippetName] Data object or snppet name if first param contains data
	//  * @param {string} [snippetName] Name of BLOCK which will be returned to client
	//  */
	// snippetView(viewOrData, dataOrSnippetName = null, snippetName = "content") {
	// 	var rtrnData = {
	// 		snippetName: snippetName,
	// 		isSingle: true,
	// 		isSnippet: true
	// 	};
	//
	// 	if (typeof viewOrData == "string") {
	// 		rtrnData.view = viewOrData;
	// 		rtrnData.data = data || {};
	// 	} else {
	// 		rtrnData.view = null;
	// 		rtrnData.data = viewOrData || {};
	// 		rtrnData.snippetName = dataOrSnippetName || snippetName;
	// 	}
	//
	// 	this.exited = true;
	// 	this.callback(null, rtrnData);
	// 	this.callback = function () { };
	// }
	//

	/**
	 * Ends request with result of given data and type
	 * @param data
	 * @param {String} [type] Content-type
	 */
	data(data, type = "text/plain")
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
	json(jsonObj)
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
	error(message, statusCode = 500, error = undefined)
	{
		return {
			status: statusCode,
			message: message,
			error: error
		};
	}

	/**
	 * Sends file to client for download
	 * @param {String} filePath
	 * @param {String} [newName]
	 * @param contentType
	 */
	fileDownload(filePath, newName, contentType)
	{
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
			this.exit();
		});
	}

	//endregion

	//endregion
}