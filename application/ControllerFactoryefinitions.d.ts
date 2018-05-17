//region Type declarations

/**
 * Controller identificator, it's full controller name in lower case.
 * @typedef {string} ControllerId
 */
declare type ControllerIdString = string;

/**
 * Action identificator, it's full action name (including HTTP method) in lower case.
 * @typedef {string} ActionIdString
 */
declare type ActionIdString = string;

/**
 * Sub-App identificator, it's full Sub-App name in lower case.
 * @typedef {string} SubAppIdString
 */
declare type SubAppIdString = string;

/**
 * Controller name, it's full controller name without keyword 'Controller' at the end (upper camel-case).
 * @typedef {string} ControllerNameString
 */
declare type ControllerNameString = string;

/**
 * Action name, it's full controller's method name without HTTP method at the beginning of the word (lower camel-case).
 * @typedef {string} ActionNameString
 */
declare type ActionNameString = string;

/**
 * Full Sub-App name (upper camel-case).
 * @typedef {string} SubAppNameString
 */
declare type SubAppNameString = string;

/**
 * Full controller name (upper camel-case).
 * @typedef {string} FullControllerNameString
 */
declare type FullControllerNameString = string;

/**
 * Full action name (including method; lower camel-case).
 * @typedef {string} FullActionNameString
 */
declare type FullActionNameString = string;

/**
 * Full Sub-App name (Upper camel-case).
 * @typedef {string} FullSubAppNameString
 */
declare type FullSubAppNameString = string;

//endregion

//region Interfaces

declare interface ISubAppInfo {
	name: FullSubAppNameString,
	dir: string,
	controllers: {[controllerName: string]: IControllerInfo}
}

declare interface IActionInfo {
	name: FullActionNameString,
	params: Array<string>,
	method: string | null
}

declare interface IControllerInfo {
	name: ControllerNameString,
	params: Array<string>,
	getClass: () => Function,
	actions: {[actionName: string]: IActionInfo}
}

declare interface IApplicationTargetPoint {
	subApp: FullSubAppNameString;
	controller: FullControllerNameString;
	action: FullActionNameString;
}

//endregion