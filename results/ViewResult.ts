/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

export class ViewResult implements IViewContext
{
	//region Fields

	/**
	 * Errors from server
	 */
	errors: Array<any>;

	/**
	 * Messages from server
	 */
	messages: Array<IMessage>;

	/**
	 * Current language
	 */
	lang: string;

	/**
	 * View name/path
	 */
	view: string;

	/**
	 * Data
	 */
	data: {};

	/**
	 * Should be just raw (not rendered) template returned?
	 */
	rawTemplate: boolean;

	/**
	 * Should be just partial view returned?
	 */
	partialView: boolean;

	/**
	 * Name of snippet if just snippet required
	 */
	snippet: string;

	// endregion

	// region Ctors

	constructor(view: string, data: {})
	{
		this.view = view;
		this.data = data;
	}

	//endregion
}