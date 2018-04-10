/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {RequestException} from "../exceptions/RequestException";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: ControllerFactory");
}

const FUNC_PARAM_REGEX = /^[\s\S]*?\(([\s\S]*?)\)/;
const CTOR_PARAM_REGEX = /^[\s\S]*?constructor\s*\(([\s\S]*?)\)/;
export const MAIN_SUBAPP_NAME = "_default";

const istanceKey = Symbol.for("Jumbo.Application.ControllerFactory");
let instance = global[istanceKey] || null;
let locator: Locator = null; // Resolved in get instance()

/**
 * Provide access to all controllers and actions in application. Contains verifications and constructions methods.
 * @class
 * @static
 * @memberOf Jumbo.Application
 */
export class ControllerFactory
{
	//region Fields

	/**
	 * List of laded subapps
	 */
	private subApp: { [subAppName: string]: ISubAppInfo } = {};

	//endregion

	//region Static properties

	/**
	 * Get instance of ControllerFactory
	 * @return {ControllerFactory}
	 */
	static get instance(): ControllerFactory
	{
		if (instance == null)
		{
			global[istanceKey] = instance = Reflect.construct(ControllerFactory, [], ControllerFactoryActivator);

			// Fill locator but return instance first;
			setImmediate(() => {
				locator = Jumbo.Application.Locator.instance;
			});
		}

		return instance;
	}

	//endregion

	//region Ctors

	constructor()
	{
		if (new.target != ControllerFactoryActivator)
		{
			throw new Error("You cannot call private constructor!");
		}

		this.loadControllersAndActions();
		this.clearRequireCache();
	}

	//endregion

	//region Public methods

	// noinspection JSMethodCanBeStatic
	/**
	 * Get subapp identifier by name
	 * @param {string} subApp
	 * @returns {string}
	 */
	getSubAppId(subApp: string): SubAppIdString
	{
		return subApp.toLowerCase();
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Get ID name of controller
	 * @param {string} controller
	 * @returns {string}
	 */
	getControllerId(controller: string): ControllerIdString
	{
		controller = controller.toLowerCase();

		if (controller.slice(-10) == "controller") return controller;
		return controller + "controller";
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Get ID name of action
	 * @param {string} action
	 * @param {string} method HTTP method type
	 * @returns {string}
	 */
	getActionId(action: string, method: string = "action"): ActionIdString
	{
		method = method.toLowerCase();
		action = action.toLowerCase();

		if (action.slice(0, method.length) == method) return action;
		return method + action;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Return name of sub-app
	 * @param {string} subApp
	 * @returns {string}
	 * @throws {Error} Throw error if Sub-App not exists
	 */
	getSubAppName(subApp: string): SubAppNameString
	{
		return this.getSubAppInfo(this.getSubAppId(subApp)).name;
	}

	/**
	 * Return full controller name
	 * @param {string} controller Controller name
	 * @param {string} subAppId SubApp name
	 * @returns {string}
	 * @throws {Error} Throw error if controller not exists
	 */
	getControllerName(controller: string, subAppId: SubAppIdString = MAIN_SUBAPP_NAME): ControllerNameString
	{
		return this.getControllerInfo(this.getControllerId(controller), subAppId).name;
	}

	/**
	 * Return full name of action in given controller
	 * @param {string} action
	 * @param {string} controllerId
	 * @param {string} subAppId
	 * @param {string} method
	 * @returns {string}
	 * @throws {Error} Throw error if action not exists
	 */
	getActionName(action: string, controllerId: ControllerIdString, subAppId: SubAppIdString = MAIN_SUBAPP_NAME,
		method: string = "action"): ActionNameString
	{
		return this.getActionInfo(this.getActionId(action, method), controllerId, subAppId).name;
	}

	/**
	 * Create new instace of specified controller
	 * @param {string} controllerId
	 * @param {string} [subAppId]
	 * @param {Scope} [scope]
	 * @returns {object | null} Class instance
	 * @throws {Error} If controller doesn't exist
	 */
	createController(controllerId: ControllerIdString, subAppId: SubAppIdString, scope: Scope)
	{
		let ctrlInfo = this.getControllerInfo(controllerId, subAppId);

		// Get controller
		let Controller = ctrlInfo.getClass();

		// Resolve
		return scope.resolveUnregistered(Controller);
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get informations about sub-app
	 * @param {string} subAppId
	 * @return {{name: string, dir: string} | null}
	 */
	getSubAppInfo(subAppId: SubAppIdString): ISubAppInfo
	{
		let subAppInfo = this.subApp[subAppId];
		if (!subAppInfo) throw new Error(`Sub-app ${subAppId} was not found.`);
		return subAppInfo;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get informations about controller
	 * @param {string} controllerId
	 * @param {string} subAppId
	 * @returns {IControllerInfo}
	 */
	getControllerInfo(controllerId: ControllerIdString, subAppId: SubAppIdString): IControllerInfo
	{
		let subAppInfo = this.getSubAppInfo(subAppId);
		let controllerInfo = subAppInfo.controllers[controllerId];
		if (!controllerInfo) throw new Error(`Controller ${controllerId} was not found in sub-app ${subAppId}`);
		return controllerInfo;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Get informations about action
	 * @param {string} actionId
	 * @param {string} controllerId
	 * @param {string} subAppId
	 * @returns {IActionInfo}
	 */
	getActionInfo(actionId: ActionIdString, controllerId: ControllerIdString, subAppId: SubAppIdString): IActionInfo
	{
		let controllerInfo = this.getControllerInfo(controllerId, subAppId);
		let actionInfo = controllerInfo.actions[actionId];
		if (!actionInfo) throw new Error(`Action ${actionId} was not found in controller ${controllerId} in sub-app ${subAppId}`);
		return actionInfo;
	}

	// /**
	//  * Return name of controller in sub-app
	//  * @param {String} subApp
	//  * @param {String} controllerName
	//  * @returns {String | null}
	//  */
	// getSubAppControllerName(subApp, controllerName) {
	// 	controllerName = this.getControllerId(controllerName);
	// 	return this.subApp[subApp] && this.subApp[subApp].controllers[controllerName]
	// 		? this.subApp[subApp].controllers[controllerName].name : null;
	// }
	//
	// /**
	//  * Return name of action in sub-app controller
	//  * @param {String} subApp
	//  * @param {String} controllerName
	//  * @param {String} actionName
	//  * @returns {String | null}
	//  */
	// getSubAppActionName(subApp, controllerName, actionName) {
	// 	controllerName = this.getControllerId(controllerName);
	// 	actionName = this.getActionId(actionName);
	//
	// 	return this.subApp[subApp] && this.subApp[subApp].controllers[controllerName]
	// 	&& this.subApp[subApp].controllers[controllerName].actions[actionName]
	// 		? this.subApp[subApp].controllers[controllerName].actions[actionName].name : null;
	// }
	//
	// /**
	//  * Create new instance of sub-app controller
	//  * @param {String} subApp
	//  * @param {String} controllerName
	//  * @returns {Controller | null}
	//  */
	// createSubAppController(subApp, controllerName, scope) {
	// 	controllerName = this.getSubAppControllerName(subApp, controllerName);
	//
	// 	// Verify cntrl existance
	// 	if (!controllerName) throw new Error(`Controller '${controllerName}' cannot be created, it doens't
	// exists.`);
	//
	// 	subApp = this.getSubAppName(subApp);
	//
	// 	// Verify subapp existance
	// 	if (!subApp) throw new Error(`Controller '${controllerName}' cannot be created, subapp ${subApp} doens't
	// exists.`);  var Controller = App.SubApps[subApp].Controllers[controllerName];  return
	// scope.resolveUnregistered(Controller); }

	// /**
	//  * Test if controller and action exist
	//  * @param {string} controllerName
	//  * @param {string} actionName
	//  * @param {{}} [subApp]
	//  * @returns {boolean}
	//  */
	// targetExists(controllerName, actionName, subApp: string = MAIN_SUBAPP_NAME): Error
	// {
	// 	controllerName = this.getControllerId(controllerName);
	// 	actionName = this.getActionId(actionName);
	//
	// 	let sa = this.subApp[subApp];
	// 	if (!sa) return new Error(`Subapp '${subApp}' doesn't exist.`);
	//
	// 	let ctrl = sa.controllers[controllerName];
	// 	if (!ctrl) return new Error(`Controller '${controllerName}' of sub-app ${subApp} doesn't exist.`);
	//
	// 	let act = ctrl.actions[actionName];
	// 	if (!act)
	// 	{
	// 		return new Error(`Action '${actionName}' doesn't exists in ${controllerName} of sub-app ${subApp}.`);
	// 	}
	//
	// 	return null;
	// }

	// // noinspection JSMethodCanBeStatic
	// /**
	//  * Verify existance of given location in application
	//  * @param {string} controller
	//  * @param {string} action
	//  * @param {string} subApp
	//  * @param method
	//  * @throws {Error}
	//  */
	// verifyTarget(controller: string, action: string, subApp: string, method: string)
	// {
	// 	this.getTargetPoint(subApp, controller, action, method);
	// }

	/**
	 * Verify existance of given application target point and returns its full names
	 * @param {string} subApp
	 * @param {string} controller
	 * @param {string} action
	 * @param {string} method
	 * @returns {IApplicationTargetPoint}
	 * @throws {Error}
	 */
	getTargetPoint(subApp: string, controller: string, action: string, method: string = undefined): IApplicationTargetPoint
	{
		let controllerId = this.getControllerId(controller);
		let actionId = this.getActionId(action, method);
		let subId = subApp;

		if (subApp == locator.main)
		{
			subId = MAIN_SUBAPP_NAME;
		}

		let sa = this.subApp[subId];
		if (!sa) throw new RequestException(`Subapp '${subApp}' doesn't exist.`);

		let ctrl = sa.controllers[controllerId];
		if (!ctrl) throw new RequestException(`Controller '${controller}' of sub-app '${subApp}' doesn't exist.`);

		let act = ctrl.actions[actionId] || ctrl.actions[this.getActionId(action)]; // specific methodAction OR general actionAction
		if (!act && method == undefined)
		{
			act = this.findAction(ctrl.actions, actionId);
		}
		if (!act)
		{
			throw new RequestException(`Action '${actionId}' doesn't exists in controller '${controller}' of sub-app '${subApp}'.`);
		}

		return {
			subApp: sa.name,
			controller: ctrl.name,
			action: act.name
		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Take function and return list of its parameters
	 * @param {Function} func
	 * @returns {Array}
	 */
	getFunctionParameters(func)
	{
		return this.getParameters(func, FUNC_PARAM_REGEX);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Take constrcutor and return list of its parameters
	 * @param {Function} func
	 * @returns {Array}
	 */
	getConstructorParameters(func): Array<string>
	{
		return this.getParameters(func, CTOR_PARAM_REGEX);
	}

	//endregion

	//region Private methods

	/**
	 * Will find action in list of actions ignoring method
	 * @param {{}} actions
	 * @param {string} action
	 * @returns {string | undefined}
	 */
	private findAction(actions: { [p: string]: IActionInfo }, action: string): IActionInfo | undefined
	{
		action = action.toLowerCase();
		let actNames = Object.keys(actions);
		let actionVariant = [];

		for (let method of ActionTypes)
		{
			actionVariant.push(method + action);
		}

		let actionName = actNames.find(act => actionVariant.includes(act));

		if (actionName != undefined)
		{
			return actions[actionName];
		}

		return undefined;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Return parametr names of function matched by regex
	 * @param {Function} func
	 * @param {RegExp} regex
	 * @returns {Array}
	 */
	private getParameters(func: Function, regex: RegExp)
	{
		let matchArgs = func.toString().match(regex);

		let args = [];

		if (matchArgs)
		{
			args = matchArgs[1].replace(/\s/g, "").split(",");

			if (args.length == 1 && args[0] == "")
			{
				args = [];
			}
		}

		return args;
	}

	/**
	 * Walk through class's prototype and discover all actions
	 * @param {Function} ctrl
	 * @returns {{}}
	 */
	private loadActionsFromController(ctrl: Function): {
		[actionName: string]: {
			name: string,
			params: Array<string>,
			method: string | null
		}
	}
	{
		let proto = ctrl.prototype;
		let actions = {};

		// Load actions
		for (let actionName of Object.getOwnPropertyNames(proto))
		{
			for (let actionType of ActionTypes)
			{
				if (actionName.substr(0, actionType.length) == actionType)
				{
					let args = this.getFunctionParameters(proto[actionName]);

					actions[actionName.toLowerCase()] = {
						name: actionName,
						params: args,
						method: actionType == "action" ? null : actionType.toUpperCase()
					};
				}
			}
		}

		return actions;
	}

	/**
	 * Walk through namespace and load all Controllers and list all their actions
	 * @returns {{}}
	 */
	private loadControllersFromNamespace(namespace: object, subAppId: string,
		appendTo: { [controllerName: string]: IControllerInfo } = {}): { [controllerName: string]: IControllerInfo }
	{
		for (let controllerName of Object.getOwnPropertyNames(namespace))
		{
			let item = namespace[controllerName];

			if (item.constructor == Object) // if it's nested namespace
			{
				this.loadControllersFromNamespace(item, subAppId, appendTo);
				continue;
			}
			else if (item.prototype == undefined)
			{
				Jumbo.Logging.Log.error(`Controllers.${controllerName} doesn't export class.`);
				continue;
			}

			// Create object for controller
			appendTo[controllerName.toLowerCase()] = {
				name: controllerName,
				params: this.getConstructorParameters(item.prototype.constructor),
				getClass: () => item,
				// getClass: () => namespace[this.subApp[subAppId].controllers[controllerName.toLowerCase()].name],
				actions: this.loadActionsFromController(item)
			};
		}

		return appendTo;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Convert camel case string to kebab case.
	 * @param subApp
	 * @returns {string}
	 */
	private camelToKebabCase(subApp)
	{
		return subApp.charAt(0).toLowerCase() + subApp.substr(1).replace(/[A-Z]/g, function (char) {
			return "-" + char.toLowerCase();
		})
	}

	/**
	 * Walk through App.SuApps, discover all subApps and their controllers and actions
	 */
	private loadControllersAndActions()
	{
		const AppNamespace = require("jumbo-core/autoloader/autoloader").App;

		if (Object.keys(AppNamespace.SubApps).length)
		{
			let subApps = Object.getOwnPropertyNames(AppNamespace.SubApps);
			let sc = subApps.length;
			let subAppName: string;

			for (let sp = 0; sp < sc; sp++)
			{
				subAppName = subApps[sp];
				this.subApp[subAppName.toLowerCase()] = {
					name: subAppName,
					dir: this.camelToKebabCase(subAppName),
					controllers: this.loadControllersFromNamespace(
						AppNamespace.SubApps[subAppName].Controllers, subAppName.toLowerCase()),
				};
			}
		}

		// Add main app
		this.subApp[MAIN_SUBAPP_NAME] = {
			name: MAIN_SUBAPP_NAME,
			dir: Jumbo.APP_DIR,
			controllers: this.loadControllersFromNamespace(AppNamespace.Controllers, MAIN_SUBAPP_NAME)
		};
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Above procedures require controllers (and their dependencies) classes so this procedure will clear cache.
	 * It's important to keep memory as low as possible. Big applications should not use all code it contains,
	 * maybe just in some cases. If some memory limit for app exists, it can be shutdowned after reaching the limit.
	 * It will clear memory and application can start with free memory again and run some time utill it reach limit
	 * again.
	 */
	private clearRequireCache()
	{
		const {uncache} = require("jumbo-core/utils/require");

		for (let modName of Object.keys(require.cache))
		{
			let mod = require.cache[modName];

			// delete all cached modules from APP_DIR
			if (mod && mod.filename.slice(0, Jumbo.APP_DIR.length).toLowerCase()
				== Jumbo.APP_DIR.toLowerCase() && mod.filename.charAt(Jumbo.APP_DIR.length) != ".")
			{
				uncache(modName);
			}
		}

		if (Jumbo.config.jumboDebugMode)
		{
			console.log("[DEBUG] require.cache cleared");
		}
	}

	//endregion
}

/**
 * Activator used for creating instance of ControllerFactory
 */
class ControllerFactoryActivator extends ControllerFactory
{
}

// At bottom cuz of cycle dependencies
import {ActionTypes, Locator} from "jumbo-core/application/Locator";
import {Scope} from "jumbo-core/ioc/Scope";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: ControllerFactory END");
}