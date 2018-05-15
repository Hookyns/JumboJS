/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {Exception} from "../exceptions/Exception";

if (Jumbo.config.jumboDebugMode) {
	console.log("[DEBUG] REQUIRE: ErrorResult");
}

/**
 * Model holding error context data.
 */
export class ErrorResult
{
	//region Fields

	/**
	 * Server log message describeing error
	 */
	message: string;

	/**
	 * Return status code
	 */
	statusCode: number;

	/**
	 * Error
	 */
	error: Error | Exception;

	// endregion

	constructor(message: string, statusCode: number = 500, error: Error | Exception = undefined)
	{
		this.message = message;
		this.statusCode = statusCode;
		this.error = error;
	}
}

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: ErrorResut END");
}