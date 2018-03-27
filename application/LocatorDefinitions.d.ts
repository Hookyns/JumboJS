///<reference path="../node_modules/@types/node/index.d.ts"/>

declare interface ILocation {

	/**
	 * Location string
	 */
	location: string;

	/**
	 * Location name (identifier)
	 */
	locationName: string;

	/**
	 * Regex for URL matching
	 */
	locationMatcher: string | RegExp;

	/**
	 * Specific controller
	 */
	controller: string;

	/**
	 * Specific action
	 */
	action: string;

	 /**
	 * Specific parameters, fixed, predefined
	 */
	params: object;

	/**
	 * It's location not specify controller nor action, both are defined in options
	 */
	targetedController: boolean;

	/**
	 * Fixed/static controller is defined
	 */
	targetedAction: boolean;

	/**
	 * Options
	 */
	options: any | null;

	/**
	 * Sub-App name if limited to specific Sub-App
	 */
	subApp: string | null;

	/**
	 *  Names of variables in order as defined in location
	 */
	variables: string[];

	/**
	 * Position of action parameter in location string
	 */
	actionIndex: number | null;

	/**
	 * Position of controller parameter in location string
	 */
	controllerIndex: number | null;
}

declare interface ILocationOptions {
	/**
	 * Points to specific controller statically
	 */
	controller: string;

	/**
	 * Points to specific action statically
	 */
	action: string;

	/**
	 * List of aditional static parameters
	 */
	params: object;
}

declare interface ILocatorMatch {
	/**
	 * Matched location
	 */
	location: ILocation;

	/**
	 * Subapp name
	 */
	subApp: string;

	/**
	 * controller name
	 */
	controller: string;

	/**
	 * Action name
	 */
	action: string;

	/**
	 * request parameters
	 */
	params: {[key: string]: any};

	/**
	 * Requested locale code
	 */
	locale: string;

	// /**
	//  * Field holding true if URL should be checked for long format
	//  */
	// shouldCheck: boolean;
	//
	// /**
	//  * Id true if params contains elements
	//  */
	// hasParams: boolean;

	/**
	 * Was action defined in URL?
	 */
	actionInUrl: boolean;

	/**
	 * Was controller defined in url?
	 */
	controllerInUrl: boolean;
}