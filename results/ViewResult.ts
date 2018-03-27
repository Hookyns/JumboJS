/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

if (Jumbo.config.jumboDebugMode) {
	console.log("[DEBUG] REQUIRE: ViewResult");
}

/**
 * Model holding view context data.
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
	 * Current locale
	 */
	locale: string;

	/**
	 * View name/path
	 */
	view: string;

	/**
	 * Data
	 */
	data: any;

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

if (Jumbo.config.jumboDebugMode)
{
	console.log("[DEBUG] REQUIRE: ViewResut END");
}