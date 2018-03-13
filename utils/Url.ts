/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {Request} from "jumbo-core/application/Request";
import {Locator} from "jumbo-core/application//Locator";

const locator = Locator.instance;

/**
 * Class for URL generation
 * @memberOf Jumbo.Utils
 */
export class Url
{
	//region Fields

	private options: any = {};

	//endregion

	//region Ctors

	constructor(request: Request)
	{
		// Copy default values from current request
		this.options = {
			action: request.action,
			controller: request.controller,
			subApp: request.subApp,
			location: request.location.locationName,
			lang: request.language,
			params: {}
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
	 * Set language
	 * @param {string} language
	 * @returns {Url}
	 */
	public language(language: any): Url
	{
		this.options.lang = language;
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

		if (this.options.location)
		{
			return locator.generateLocationUrl(opt.location, opt.controller, opt.action, opt.params, opt.subApp, opt.lang);
		}
		else
		{
			return locator.generateUrl(opt.controller, opt.action, opt.params, opt.subApp, opt.lang);
		}
	}

	//endregion
}