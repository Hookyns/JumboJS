/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import {Exception} from "./Exception";

/**
 * @memberOf Jumbo.Exceptions
 */
export class RequestException extends Exception {
	/**
	 * HTTP return status code which should be returned to client
	 */
	statusCode: number;

	/**
	 * If some redirect is required
	 */
	redirectTo: string;

	constructor(message: string, statusCode: number = 404, buildStack: boolean = false, redirectTo: string = null) {
		super(message);
		
		this.statusCode = statusCode;
		this.redirectTo = redirectTo;
	}
}
