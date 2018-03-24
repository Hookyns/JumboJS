/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

//region Imports

import * as $qs from "querystring";
import * as $url from "url";
import * as $http from "http";
import * as $object from "jumbo-core/utils/object";
import {ControllerFactory} from "jumbo-core/application/ControllerFactory";
import {RequestException} from "jumbo-core/exceptions/RequestException";

//endregion

//region Enums

const ParamType = {
	Integer: /[0-9]+/,
	StringId: /[a-zA-Z_]/,
	Number: /[0-9]*(?:\.[0-9]+)?/
};

const Method = {
	POST: "POST",
	PUT: "PUT",
	GET: "GET",
	DELETE: "DELETE"
};

//endregion

//region Consts

export const DEFAULT_LANGUAGE = Jumbo.config.globalization.defaultLanguage;
const GLOBALIZATION_ENABLED = Jumbo.config.globalization.enabled;
export const DEFAULT_CONTROLLER = "Home";
export const DEFAULT_ACTION = "index";
// let CONTROLLER_WITHOUT_ACTION_REGEX = /^([a-z]{2})?[\/][a-z]{3,}/;
export let END_DELIMITER_TRIM_REGEX = /[\/]+$/;
const LOCATION_PARAM_REGEX = /\$([a-z][a-zA-Z]*)/g; // /(\/)?\$([a-z][a-zA-Z]*)/g;
const LOCATION_LANG_VARIABLE_NAME = "globlanguage";
const LOCATION_CTRL_VARIABLE_NAME = "controller";
const LOCATION_ACTION_VARIABLE_NAME = "action";
const DEFAULT_LOCATION_NAME = "default";
export const ActionTypes = ["action"].concat(Object.getOwnPropertyNames(Method).map(m => m.toLowerCase()));
const IS_IP_REGEX = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
const PORT_REMOVE_REGEX = /:[0-9]+$/;
const SQUARE_BRACKET_REGEX = /[\[\]]/g;
const LOCATION_ALL_SLASHES_REGEX= /\//g;
let DELIMITER_REGEX = LOCATION_ALL_SLASHES_REGEX; // Filled from setDelimiter

//endregion

//region Local functions

function locationParamReplacer(varName, lang, useLang, controller, action, params, location)
{
	if (varName == LOCATION_LANG_VARIABLE_NAME)
	{
		if (!useLang) return "";
		return lang;
	}

	if (varName == LOCATION_CTRL_VARIABLE_NAME)
	{
		if (!controller)
		{
			throw new Error("This location require controller but you didn't pass any in parameters.");
		}

		return controller;
	}

	if (varName == LOCATION_ACTION_VARIABLE_NAME)
	{
		if (!action)
		{
			throw new Error("This location require action but you don't pass any in parameters.");
		}
		return action;
	}

	if (params[varName])
	{
		let param = params[varName];
		delete params[varName];
		return param;
	}

	if (location.options[varName])
	{
		return location.options[varName];
	}

	return "";
}

//endrgion

let instance = null;

/**
 * Class Locator for work with URLs and routing
 * @class Locator
 * @memberOf Jumbo.Application
 */
export class Locator
{

	//region Fields

	/**
	 * Array of supported addresses
	 */
	private locations: Map<string, ILocation> = new Map();

	/**
	 * Main subdomain
	 */
	main: string = "www";

	/**
	 * Registered subdomains
	 */
	private subDomains: string[] = [];

	/**
	 * Server hostname
	 */
	host: string | null = null;

	/**
	 * Delimiter for URL parts spliting controller, action etc.
	 */
	private delimiter: string = "/";

	/**
	 * Escaped version of delimiter for Regex
	 * @type {string}
	 */
	private delimiterEscaped: string = "/";

	/**
	 * List of static URLs and their aliases.
	 * Mapping source URL to target URL.
	 */
	private urlAliases: { [sourceUrl: string]: string } = {};

	//endregion

	//region Static properties

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Returns Locator's parameter types
	 */
	static get ParamType(): {}
	{
		return ParamType;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Returns HTTP methods which framework support for actons
	 */
	static get Method(): {}
	{
		return Method;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Default controller name
	 */
	static get defaultController(): string
	{
		return DEFAULT_CONTROLLER;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Default action name
	 */
	static get defaultAction(): string
	{
		return DEFAULT_ACTION;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get Locator instance
	 */
	static get instance(): Locator
	{
		if (instance == null)
		{
			instance = Reflect.construct(Locator, [], LocatorActivator);
		}

		return instance;
	}

	//endregion

	//region Setters

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Set server hostname - used for subapp link creation
	 * @param {string} host
	 */
	setHost(host: string)
	{
		this.host = host;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Set URL part delimiter spliting controller, action etc.
	 * Eg. delimiter ~ => domain.tld/controller~action~id
	 * @param {string} delimiter
	 */
	setDelimiter(delimiter: string)
	{
		if (delimiter.length != 1) {
			throw new Error("Delimiter must be exactly one character.");
		}

		this.delimiter = delimiter;

		if (["\\", ".", "*", "?", "+", "|", "(", ")", "[", "]", "{", "}"].indexOf(delimiter) != 1)
		{
			this.delimiterEscaped = "\\" + delimiter;
		}

		// update regex contants
		// CONTROLLER_WITHOUT_ACTION_REGEX =
		// 	new RegExp("^([a-z]{2}" + this.delimiterEscaped + ")?([a-z]{3,})(" + this.delimiterEscaped + ")?$");
		END_DELIMITER_TRIM_REGEX = new RegExp(this.delimiterEscaped + "+$");
		DELIMITER_REGEX = new RegExp(this.delimiterEscaped, "g");
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Set default subdomain which will route to base app; both urls with and without main subdomain will work
	 * It's good for cases when you host application on some subdomain eg. myapp.domain.tld. Main subdomain is set to
	 * "www"
	 * @param {string} subName
	 */
	setMainSubdomain(subName: string)
	{
		this.main = subName.toLowerCase();
	}

	//endregion

	//region Ctors

	/**
	 * Private constructor
	 */
	constructor()
	{
		if (new.target != LocatorActivator)
		{
			throw new Error("You cannot call private constructor!");
		}
	}

	//endregion

	//region Public methods

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Register sub-app to Locator as subdomain
	 * @param {string} subName Name of subdomain
	 */
	addSubdomain(subName: string)
	{
		this.subDomains.push(subName.toLowerCase());
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Add new location to Locator
	 * @param {string} locationName
	 * @param {string} location
	 * @param {ILocationOptions|null} [options]
	 * @param {string} subApp
	 */
	addLocation(locationName: string, location: string, options: ILocationOptions | null = <any>{},
		subApp: string = null)
	{
		if (typeof location != "string")
		{
			throw new Error("Locaton must be string.");
		}

		if (options !== null && options.constructor !== Object)
		{
			throw new Error("Options parameter must be Object.");
		}

		if (this.locations.has(locationName))
		{
			throw new Error("Location with this name already exists.");
		}

		let loc = this.prepareNewLocation(location, options, subApp);
		loc.locationName = locationName;

		this.locations.set(locationName, loc);
	}

	/**
	 * Add default location to Locator
	 * @param {string} location
	 */
	addDefaultLocation(location: string)
	{
		if (typeof location != "string")
		{
			throw new Error("Locaton must be string.");
		}

		if (this.locations.has(DEFAULT_LOCATION_NAME))
		{
			throw new Error("Default location already exists.");
		}

		// Store current items
		let locationEntries = this.locations.entries();

		// Create new map
		this.locations = new Map<string, ILocation>();

		// Set default as first
		let loc = this.prepareNewLocation(location, {}, null);
		loc.locationName = DEFAULT_LOCATION_NAME;
		this.locations.set(DEFAULT_LOCATION_NAME, loc);

		// Add original values
		let key, item;
		for ([key, item] of locationEntries)
		{
			this.locations.set(key, item);
		}
	}

	/**
	 * Generate full URL with protocol and host. Host must be set by setHost().
	 * @param {string} controller
	 * @param {string} action
	 * @param {Array} [slashParams]
	 * @param {Object} [queryParams]
	 * @param {string} [subApp]
	 * @param {string} [lang]
	 * @param {string} [protocol]
	 * @param {string} [host]
	 * @returns {string}
	 */
	generateUrl(controller: ControllerNameString, action: ActionNameString, slashParams: object[] = [],
		queryParams: object = {}, subApp: string = null, lang: string = null, protocol: string = null,
		host: string = null)
	{
		ControllerFactory.instance.getTargetPoint(subApp, controller, action);

		let baseUrl = "/";

		if (host || protocol || subApp)
		{
			baseUrl = (protocol || "http") + "://" + (!!subApp ? (subApp + ".") : "") + (host || this.host) + "/";
		}

		if (lang && lang != DEFAULT_LANGUAGE && GLOBALIZATION_ENABLED)
		{
			baseUrl += lang + this.delimiter;
		}

		let queryParamsLength = Object.keys(queryParams).length;
		let noParams = slashParams.length == 0 && queryParamsLength == 0;

		// Base controller and action - return base URL
		if (controller == DEFAULT_CONTROLLER
			&& action == DEFAULT_ACTION && noParams)
		{
			return baseUrl;
		}
		// Default action - return base URL just with controller
		else if (action == DEFAULT_ACTION && noParams)
		{
			return baseUrl + controller.toLowerCase();
		}
		else
		{
			let url = baseUrl + controller.toLowerCase() + this.delimiter + action.toLowerCase();

			if (!noParams)
			{
				if (slashParams.length === 0) url += this.delimiter;

				for (let i = 0; i < slashParams.length; i++)
				{
					url += this.delimiter + slashParams[i];
				}

				if (queryParamsLength != 0)
				{
					url += "&" + $qs.stringify(queryParams);
				}
			}

			return url;
		}
	}

	/**
	 * Create URL from specified Location
	 * @param {string} locationName
	 * @param {string} [controller]
	 * @param {string} [action]
	 * @param {object} [params]
	 * @param {string} [subApp]
	 * @param {string} [lang]
	 * @param {string} [protocol]
	 * @param {string} [host]
	 * @returns {string}
	 */
	generateLocationUrl(locationName, controller = null, action = null, params = {},
		subApp: string = null, lang = null, protocol: string = null, host: string = null)
	{
		let location = this.locations.get(locationName);

		if (!location)
		{
			throw new Error(`Location ${locationName} doesn't exists.`);
		}

		if (params.constructor !== Object)
		{
			throw new Error("Parameter 'params' must be Object");
		}

		if (location.options.controller)
		{
			controller = location.options.controller;
		}

		if (location.options.action)
		{
			action = location.options.action;
		}

		action = action.toLowerCase();
		controller = controller.toLowerCase();

		const useLang = GLOBALIZATION_ENABLED && lang && lang != DEFAULT_LANGUAGE;
		lang = (lang || "").toLowerCase();

		// Remove optional parameters -> remove brackets
		let loc = location.location.replace(SQUARE_BRACKET_REGEX, "");
		const langInLoc = loc.indexOf("$" + LOCATION_LANG_VARIABLE_NAME) !== -1;

		let url = loc
			.replace(LOCATION_PARAM_REGEX, (_, varName) =>
				locationParamReplacer(varName, lang, useLang, controller, action, params, location))
			.replace(LOCATION_ALL_SLASHES_REGEX, this.delimiter); // replace location delimiter

		if (url.charAt(url.length - 1) == this.delimiter) {
			url = url.slice(0, -1);
		}

		let baseUrl = "/";

		if (host || protocol || location.subApp)
		{
			baseUrl = (protocol || "http") + "://" + (!!subApp ? (subApp + ".") : "") + (host || this.host) + "/";
		}

		if (!langInLoc && useLang)
		{
			baseUrl += lang + this.delimiter;
		}

		if (Object.keys(params).length)
		{
			url += "?" + $qs.stringify(params);
		}

		return baseUrl + url;
	}

	/**
	 * Parse URL address to parts (controller, acton, subapp)
	 * @param {$http.IncomingMessage} request
	 * @returns {Object | null}
	 */
	parseUrl(request: $http.IncomingMessage): ILocatorMatch
	{
		let url = request.url.replace(DELIMITER_REGEX, "/"); // replace custom delimiters by slashes
		let parse = $url.parse(url);
		url = parse.pathname.slice(1); // Slice, remove first slash
		let subApp = this.getSubAppFromRequest(request);

		// Test empty URL - default ctrl and action
		let emptyLocation = this.emptyLocationMatch(parse, subApp);
		if (emptyLocation) return emptyLocation;

		let match: RegExpMatchArray;
		let location: ILocation;

		// Try to match current url path
		[location, match] = <any>this.findLocationForUrl(url, subApp);

		if (!location) return null;

		let matchedAction = match[location.actionIndex];
		let matchedController = match[location.controllerIndex];

		let res: ILocatorMatch = {
			location: location,
			subApp: subApp,
			controller: location.targetedController
				? location.controller
				: (matchedController || DEFAULT_CONTROLLER),
			action: location.targetedAction
				? location.action
				: (matchedAction || DEFAULT_ACTION),
			params: $object.clone(location.params), // add predefined parameters
			language: GLOBALIZATION_ENABLED ? (match[1] || DEFAULT_LANGUAGE) : DEFAULT_LANGUAGE,
			actionInUrl: !!matchedAction,
			controllerInUrl: !!matchedController
		};

		let c = location.variables.length;

		// Slash params
		for (let i = 0; i < c; i++)
		{
			let variable = location.variables[i];

			if (variable != LOCATION_CTRL_VARIABLE_NAME
				&& variable != LOCATION_ACTION_VARIABLE_NAME
				&& variable != LOCATION_LANG_VARIABLE_NAME
			)
			{
				// Add parametr from URL
				res.params[variable] = match[i + 1];
			}
		}

		// Query params
		let queryParams = $qs.parse(parse.query);

		for (let qp in queryParams)
		{
			res.params[qp] = queryParams[qp];
		}

		// if (Object.keys(res.params).length)
		// {
		// 	res.hasParams = true;
		// }

		return res;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Create alias for some url. Eg. you have static file /public/robots.txt and you want to be under url /robots.txt
	 * so then add url alias addUrlAlias("/public/robots.txt", "/robots.txt")
	 * @param {string} url Target URL
	 * @param {string} alias Alias for target URL
	 */
	addUrlAlias(url, alias)
	{
		this.urlAliases[alias] = url;
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Return URL for alias if registered, otherwise null
	 * @private
	 * @param {string} alias
	 * @returns {string | undefined}
	 */
	getUrlForAlias(alias)
	{
		return this.urlAliases[alias];
	}

	//endregion

	//region Private methods

	// noinspection JSMethodCanBeStatic
	/**
	 *
	 * @param {$qs.UrlWithStringQuery} parse
	 * @param {string} subApp
	 * @returns {ILocatorMatch}
	 */
	private emptyLocationMatch(parse: any, subApp: string): ILocatorMatch
	{
		let emptyPath = parse.pathname == "/";

		// If just slash
		if (emptyPath/* || parse.pathname.length == 3*/)
		{ // / or eg. /en - controller must have at least 3 characters
			// should be validate with regex but it's gonna be taken as language so jung language will have bad format
			// user catch that and show error, that given language doesn't exists
			let lang = /*parse.pathname.slice(1) ||*/DEFAULT_LANGUAGE;

			return {
				location: this.locations.get(DEFAULT_LOCATION_NAME),
				subApp: subApp,
				controller: DEFAULT_CONTROLLER,
				action: DEFAULT_ACTION,
				params: $qs.parse(parse.query),
				language: lang,
				// shouldCheck: false,
				// hasParams: false,
				actionInUrl: false,
				controllerInUrl: false
			};
		}

		return null;
	}

	//noinspection JSMethodCanBeStatic
	/**
	 * Extract subapp from request
	 * @param {$http.IncomingMessage} request
	 * @returns {Array}
	 */
	private extractSubApp(request)
	{
		let host = request.headers.host.replace(PORT_REMOVE_REGEX, ""); //request.url.replace(/http(s)?:\/\//, "");

		// Test if host is IP - no subapp
		if ((IS_IP_REGEX).test(host))
		{
			return this.main;
		}

		// Count domains - if less than 3, no subdomain used
		let s = host.split(".");
		if (s.length < 3)
		{
			return this.main;
		}

		return (s[0] || this.main).toLowerCase();
	}

	/**
	 * Find registered location by URL
	 * @param {string} url
	 * @param {string} subApp
	 * @returns {[ILocation, RegExpMatchArray]|null} Returns ILocation or null if location not found
	 */
	private findLocationForUrl(url: string, subApp: string): Array<ILocation | RegExpMatchArray> | null
	{
		let match: RegExpMatchArray;

		for (let [_, location] of this.locations)
		{
			match = url.match(location.locationMatcher);

			if (match !== null && (
					// If no subapp in request and matched location is for main subapp
					(subApp == null && location.subApp == this.main)

					// OR subapp in request match subapp in location
					|| subApp == location.subApp

					// OR no subapp in matched location speficied (location for all subapps)
					|| location.subApp === null
				)
			)
			{
				return [location, match];
			}
		}

		return [null, null];
	}

	/**
	 * Extract sub app from request's URL and do some extra stuff
	 * @param request
	 * @returns {string}
	 */
	private getSubAppFromRequest(request)
	{
		let subApp = this.extractSubApp(request);

		if (subApp === this.main)
		{
			return subApp;
		}

		for (let sub of this.subDomains)
		{
			if (sub == subApp)
			{
				return subApp;
			}
		}

		throw new Error(`Subdomain '${subApp}' is not regitered!`);
	}

	/**
	 * Create regex for matching URLs
	 * @param {string} location
	 * @param {ILocation} loc
	 * @param {ILocationOptions | object} options
	 */
	private createLocationMatcher(location: string, loc: ILocation, options: ILocationOptions | any)
	{
		// Add language if enabled and not in location
		if (GLOBALIZATION_ENABLED && location.indexOf("$" + LOCATION_LANG_VARIABLE_NAME) === -1)
		{
			location = "[$" + LOCATION_LANG_VARIABLE_NAME + "[/]]" + location; // There must be slash after language but just optional cuz URL can be just '/en'
		}

		// location = "^" + location;

		// proc optional part
		location = location
			.replace(/\[/g, "(?:")
			.replace(/]/g, ")?");

		// // Replace location delmiter with registered delimiter
		// if (this.delimiter != "/")
		// {
		// 	// var delimiter = this.delimiter;
		// 	//
		// 	// if (["\\", ".", "*", "?", "+", "|", "(", ")", "[", "]", "{", "}"].indexOf(delimiter) != 1) {
		// 	// 	delimiter = "\\" + delimiter;
		// 	// }
		//
		// 	// All locations should "/" as delimiter. But in real urls there will be specified delimiters
		// 	location = location.replace(/\//g, this.delimiter);
		// }

		// proc variables
		loc.locationMatcher = new RegExp("^" + location.replace(LOCATION_PARAM_REGEX, (_, varName) => {
			loc.variables.push(varName);

			if (varName == LOCATION_LANG_VARIABLE_NAME)
			{
				return "([a-z]{2})";
			}

			if (varName == LOCATION_CTRL_VARIABLE_NAME)
			{
				return "([a-zA-Z]{3,})";
			}

			if (varName == LOCATION_ACTION_VARIABLE_NAME)
			{
				return "([a-zA-Z]{2,})";
			}

			varName = "$" + varName;

			if (options[varName])
			{
				if (options[varName].constructor != RegExp) {
					throw new Error(`Location parameter '$${varName}' must be regular expression.`);
				}

				return "(" + options[varName].toString().slice(1, -1) + ")";
			}

			return "([a-zA-Z0-9-_]+)";
		}) + "$");

		loc.actionIndex = loc.variables.indexOf(LOCATION_ACTION_VARIABLE_NAME) + 1;
		loc.controllerIndex = loc.variables.indexOf(LOCATION_CTRL_VARIABLE_NAME) + 1;
	}

	/**
	 * Construct Location
	 * @param {string} location
	 * @param {ILocationOptions | object} options
	 * @param {string} subApp
	 * @returns {ILocation}
	 */
	private prepareNewLocation(location: string, options: ILocationOptions | any, subApp: string)
	{
		let loc: ILocation = {
			locationName: "",
			location: location,
			locationMatcher: null,
			controller: null,
			action: null,
			params: options.params || {},
			targetedController: false, // It's location which not specify controller nor action, both are defined in
		                               // options
			targetedAction: false,
			options: options,
			subApp: subApp,
			variables: [], // Names of variables in order as defined in location
			controllerIndex: null,
			actionIndex: null // Indexes are used for replace when creating URL;
			// Indexes are found here while start than later in each request mb many times - little performance
			// improvement
		};

		if (options.controller)
		{
			loc.controller = options.controller;
			loc.targetedController = true;
		}
		else
		{
			// If no controller is defined then location must contain $controler variable
			if (location.indexOf("$controller") === -1)
			{
				throw new Error("No controller specified in this location.");
			}
		}

		if (options.action)
		{
			loc.action = options.action;
			loc.targetedAction = true;
		}
		else
		{
			// If no action is defined than location must contain $action variable
			if (!location.match(/\$action/))
			{
				throw new Error("No action specified in this location.");
			}
		}

		this.createLocationMatcher(location, loc, options);

		return loc;
	}

	//endregion
}

class LocatorActivator extends Locator
{
}