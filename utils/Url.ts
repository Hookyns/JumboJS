/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Url");
}

/**
 * Class for URL generation
 * @class Url
 * @memberOf Jumbo.Utils
 */
export class Url
{
	//region Fields

	private options: any = {};

	private request: Request;

	//endregion

	//region Ctors

	constructor(request: Request)
	{
		this.request = request;

		// Copy default values from current request
		this.options = {
			action: request.action,
			controller: request.controller,
			subApp: request.subApp,
			location: request.location.locationName,
			locale: request.locale,
			params: null
		};
	}

	//endregion

	//region Public methods

	/**
	 * Set action
	 * @param {string} action
	 * @param {string} [controller]
	 * @param {string} [params]
	 * @returns {Url}
	 */
	public action(action: string, controller?: string, params?: any): Url
	{
		this.options.action = action;
		if (controller) this.options.controller = controller;
		if (params) this.options.params = params;
		return this;
	}

	/**
	 * Set controller
	 * @param {string} controller
	 * @returns {Url}
	 */
	public controller(controller: string): Url
	{
		this.options.controller = controller;
		return this;
	}

	/**
	 * Set subApp
	 * @param {string} subApp
	 * @returns {Url}
	 */
	public subApp(subApp: string): Url
	{
		this.options.subApp = subApp;
		return this;
	}

	/**
	 * Set params
	 * @param {string} params
	 * @returns {Url}
	 */
	public params(params: any): Url
	{
		this.options.params = params;
		return this;
	}

	/**
	 * Set locale
	 * @param {string} locale
	 * @returns {Url}
	 */
	public locale(locale: any): Url
	{
		this.options.locale = locale;
		return this;
	}

	/**
	 * Set location
	 * @param {string} location
	 * @returns {Url}
	 */
	public location(location: string): Url
	{
		this.options.location = location;
		return this;
	}

	/**
	 * Will return final URL
	 * @returns {string}
	 */
	public getUrl(): string
	{
		const opt = this.options;
		opt.location = opt.location || Locator.defaultLocationName;

		if (opt.params == null) {
			opt.params = {};
			// opt.params = Locator.getLocationParamsWithoutSystems( / TODO: ?
			// 	this.request.params, this.request.location);
		}

		// if (opt.location)
		// {
			return Locator.instance.generateLocationUrl(opt.location, opt.controller, opt.action, opt.params, opt.subApp, opt.locale);
		// }
		// else
		// {
		// 	return Locator.instance.generateUrl(opt.controller, opt.action, opt.params, opt.subApp, opt.locale);
		// }
	}

	//endregion
}

import {Request} from "jumbo-core/application/Request";
import {Locator} from "jumbo-core/application//Locator";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: Url END");
}