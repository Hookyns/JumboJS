/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

/**
 * Custom base Exception for inheritance.
 * Not inherited from Error because it builds stack which is killing performance.
 * @memberOf Jumbo.Exceptions
 */
export class Exception {
	/**
	 * Message of exception
	 */
	message: string;

	/**
	 * If instance created with 'withStack', here will be error stack
	 */
	stack?: string;

	constructor(message: string, withStack: boolean = false) {
		this.message = message;

		if (withStack) {
			Error.captureStackTrace(this);
		}
	}
}