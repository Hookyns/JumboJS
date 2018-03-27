/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode) {
	console.log("[DEBUG] REQUIRE: Request");
}

//region Imports

import * as $http from "http";
import {Application} from "jumbo-core/application/Application";

//endregion

//region Consts

const UPPER_CASE_CHAR_REGEX = /[A-Z]/;

//endregion

/**
 * Class encapsulating basic http.IncomingMessage
 * @memberOf Jumbo.Application
 */
export class Request
{
	//region Fields

	/**
	 * Contains parsed cookies if getCookies() was called
	 */
	private cookies: { [key: string]: any };

	/**
	 * Original request from http server
	 */
	request: $http.IncomingMessage;

	/**
	 * Subapp on which request points
	 */
	subApp: string;


	/**
	 * Name of matched Location
	 */
	location: ILocation;


	/**
	 * Controller on which request points
	 */
	controller: string;

	/**
	 * Controller full name
	 */
	controllerFullName: string;

	/**
	 * Action on which request points
	 */
	action: string;

	/**
	 * Action full name
	 */
	actionFullName: string;

	/**
	 * Request params
	 */
	params: { [key: string]: any } = null;

	/**
	 * POST data
	 */
	body: IBody = <any>{};

	/**
	 * Will be true if no-Cache parameter in header received, not cached result required.
	 */
	noCache: boolean = false;

	/**
	 * User's session ID
	 */
	sessionId: string;

	/**
	 * Requested locale
	 */
	locale: string;

	/**
	 * Time when was request made
	 */
	beginTime: number;

	/**
	 * HTTP methods, uppercase
	 */
	method: string;

	//endregion

	//region Ctors

	/**
	 * @param {$http.IncomingMessage} request
	 * @constructs
	 */
	constructor(request: $http.IncomingMessage)
	{
		this.request = request;
		this.noCache = request.headers["pragma"] === "no-cache";
		this.method = request.method;
	}

	//endregion

	//region Public methods

	/**
	 * Check if current request is XHR request.
	 * @description Checking x-requested-with for being "XMLHttpRequest" in request header
	 * @returns {boolean}
	 */
	isXhr(): boolean
	{
		let x: string = <string>this.request.headers["x-requested-with"];
		return x && x.toLowerCase() == "xmlhttprequest";
	}

	/**
	 * Return named object with all cookies
	 * @returns {{}}
	 */
	getCookies()
	{
		if (!this.cookies && this.request.headers.cookie)
		{
			this.cookies = {};
			(<string>this.request.headers.cookie).split(";").forEach((param) => {
				this.cookies[param.substr(0, param.indexOf("=")).trim()] = param.substr(param.indexOf("=") + 1);
			});
		}

		return this.cookies;
	}

	/**
	 * Return value of given cookie
	 * @param {string} name
	 * @returns {string|null}
	 */
	getCookie(name)
	{
		let cookies = this.getCookies();
		return cookies ? cookies[name] : null;
	}

	/**
	 * Return client's IP
	 * @returns {String}
	 */
	getIP(): string
	{
		return Application.instance.getClientIP(this.request);
	}

	//endregion

	//region Private methods

	// noinspection JSUnusedLocalSymbols
	/**
	 * Bind target to this Request
	 * @private
	 * @param subApp
	 * @param location
	 * @param controller
	 * @param action
	 * @param params
	 */
	_bindLocation(location: ILocation, subApp: FullSubAppNameString, controller: FullControllerNameString,
		action: FullActionNameString, params)
	{
		this.subApp = subApp;
		// Remove Controller from name
		this.controller = controller.slice(0, -10);
		// Remove method from name and make first letter lower case
		const actionFirstLet = action.search(UPPER_CASE_CHAR_REGEX);
		this.action = action.charAt(actionFirstLet).toLowerCase() + action.slice(actionFirstLet + 1);

		this.params = params;
		this.actionFullName = action;
		this.controllerFullName = controller;
		this.location = location;
	}

	//endregion
}

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Request END");
}