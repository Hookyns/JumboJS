/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode) {
	console.log("[DEBUG] REQUIRE: DIContainer");
}

import * as uuid from "uuid/v1";

const LifetimeScope = {
	SingleInstance: "singleinstance",
	ScopeInstance: "scopeinstance",
	InstancePerResolve: "instanceperresolve"
};

const istanceKey = Symbol.for("Jumbo.IoC.DIContainer");
let instance = global[istanceKey] || null;
let controllerFactory: ControllerFactory = null; // Set in get instance()

/**
 * IoC Dependency Injection Container used for registering and resolving types
 * @description This class solve IoC. It creates DI registrar and resolver,
 * it means you can regiser your types and than resolve them manualy or let them be resolved automaticaly
 * @memberOf Jumbo.Ioc
 */
export class DIContainer
{
	//region Fields

	/**
	 * List of registered types
	 */
	private registeredTypes: {[key: string]: IRegisteredTypeInfo} = {};

	//endregion

	//region Static properties

	/**
	 * Enum of LifetimeScopes
	 */
	static get LifetimeScope()
	{
		return LifetimeScope;
	}

	/**
	 * Get instance of DIContainer
	 * @returns {DIContainer}
	 */
	static get instance(): DIContainer
	{
		if (instance == null)
		{
			global[istanceKey] = instance = Reflect.construct(DIContainer, [], DIContainerActivator);

			// Fill controllerFactory but return instance first;
			setImmediate(() => {
				controllerFactory = Jumbo.Application.ControllerFactory.instance;
			})
		}

		return instance;
	}

	//endregion

	//region Ctors

	/**
	 * Constructor
	 */
	constructor()
	{
		if (new.target != DIContainerActivator)
		{
			throw new Error("You cannot call private constructor!");
		}
	}

	//endregion

	//region Public methods

	/**
	 * Register type (returned by expr function) under name (as)
	 * @param {Function | object} expr Type (class), instance or expression (lambda, arrow func.) which should return
	 *     Type or instance
	 * @param {string} as Name of Type which you register
	 * @param {LifetimeScope} [scope]
	 */
	register(expr: () => Function | Function | {}, as: string, scope = LifetimeScope.InstancePerResolve)
	{
		if (!expr) {
			throw new Error(`Argument value is invalid. Parameter name: ${nameof({expr})}`);
		}

		this.registeredTypes[as] = {
			expr: expr,
			isExpr: !expr.prototype/* && expr.toString().slice(0, 5) != "class"*/, // only lambda can be expression
			params: null, // Will be filled after first resolve,
			scope: scope,
			instance: null // Will be filled after first resolve if scope is SingleInstance
		};
	}

	/**
	 * Resolve arguments for Type with given name
	 * @param regType
	 * @param {Scope} [_scope]
	 * @returns Returns object with resolved arguments and looked up type
	 * @throws {Error} If no type under name exists or if registered type isn't class
	 */
	private resolveArguments(regType: IRegisteredTypeInfo, _scope: Scope = null): Array<any>
	{
		// Get list of constructor parameters
		if (!regType.params)
		{
			let type = regType.isExpr ? regType.expr() : regType.expr;
			regType.params = controllerFactory.getConstructorParameters(type.prototype.constructor);
		}

		// If type's args were already resolved and its length is 0
		if (regType.params && regType.params.length == 0)
		{
			return [];
		}

		// Resolve args

		let args = [];

		// Check if constructor arguments are registered
		// for (let i = 0; i < regType.params.length; i++)
		for (let param of regType.params)
		{
			if (this.registeredTypes[param])
			{
				if (_scope != null)
				{
					args.push(_scope.resolve(param));
				}
				else
				{
					args.push(this.resolve(param));
				}
			}
			else
			{
				args.push(null);
			}
		}

		return args;
	}

	/**
	 * Resolve instance of Type registered under given name
	 * @param {String} name
	 * @param {Scope} [_scope]
	 */
	resolve(name: string, _scope: Scope = null)
	{
		if (!this.registeredTypes[name])
		{
			throw new Error(`No type under name '${name}' is registered in DI Container.`);
		}

		let regType: IRegisteredTypeInfo = this.registeredTypes[name];

		// If registered type is registered for application scope and its instance was already created
		if (regType.scope == DIContainer.LifetimeScope.SingleInstance && regType.instance)
		{
			return regType.instance;
		}

		// If registered type is registered for ScopeInstance and its instance was already created
		if (_scope != null && regType.scope == LifetimeScope.ScopeInstance && _scope.instances[name])
		{
			return _scope.instances[name];
		}

		// Expr is ArrowFunction returning Type or instance of Type
		let type = regType.isExpr ? regType.expr() : regType.expr;

		// If it's not function, there is nothing to resolve, just return
		if (typeof type != "function") {
			return type;
		}

		try
		{
			let args = this.resolveArguments(regType, _scope);
			let instance;

			// Constructor have no args
			if (args.length == 0)
			{
				instance = new type();
			}
			else
			{
				instance = Reflect.construct(type, args);
			}

			// Add scope onto created instance
			if (_scope != null) {
				instance.__diContainerScope = _scope;
			}

			if (regType.scope === DIContainer.LifetimeScope.SingleInstance)
			{
				regType.instance = instance;
			} else if (_scope !== null && regType.scope === DIContainer.LifetimeScope.ScopeInstance)
			{
				_scope.instances[name] = instance;
			}

			return instance;
		}
		catch (e)
		{
			Log.warning(e.message);
		}

		return null;
	}

	/**
	 * Resolve unregistered type
	 * @param {Function | object} type
	 * @param [_scope]
	 * @returns {*}
	 */
	resolveUnregistered(type: () => Function | Function | {}, _scope: Scope = null)
	{
		let name = (<any>type).__diContainerUid;

		// Generate UUID and save it to secret field on type
		if (!name)
		{
			name = (<any>type).__diContainerUid = uuid();

			// Register if not registered
			if (!this.registeredTypes[name])
			{
				this.register(type, name, DIContainer.LifetimeScope.InstancePerResolve);
			}
		}

		return this.resolve(name, _scope);
	}

	//endregion
}

/**
 * Activator used for creating instance of DIContainer
 */
class DIContainerActivator extends DIContainer
{
}

// At bottom cuz of circle dependencies
import {Scope} from "./Scope";
import {ControllerFactory} from "jumbo-core/Application/ControllerFactory";
import {Log} from "../logging/Log";

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: DIContainer END");
}