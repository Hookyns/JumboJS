import {DIContainer} from "./DIContainer";

const diCotainer = DIContainer.instance;

/**
 * @memberOf Jumbo.Ioc
 */
export class Scope
{
	//region Fields

	/**
	 * Instances saved under name of dependency
	 */
	instances: {[name: string]: any} = {};

	//endregion

	// //region Ctors
	//
	// constructor()
	// {
	// }
	//
	// //endregion

	//region Public methods

	// /**
	//  * Resolve arguments for Type with given name
	//  * @param {String} name
	//  * @returns {resolveArgumentsResult} Returns object with resolved arguments and looked up type
	//  * @throws {Error} If no type under name exists or if registered type isn't class
	//  */
	// resolveArguments(name)
	// {
	// 	diCotainer.resolveArguments(name, this);
	// }

	/**
	 * Resolve instance of Type registered under given name
	 * @param {String} name
	 */
	resolve(name)
	{
		return diCotainer.resolve(name, this);
	}

	resolveUnregistered(type)
	{
		return diCotainer.resolveUnregistered(type, this);
	}

	//endregion
}