declare interface IMessage
{
	message: string;
	type: any;
}

declare interface IViewContext
{
	/**
	 * Data for view
	 */
	data: any;

	/**
	 * Errors from server
	 */
	errors: Array<any>;

	/**
	 * Messages from server
	 */
	messages: Array<IMessage>;

	/**
	 * View
	 */
	view: any;

	/**
	 * Language
	 */
	lang: string;

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
}

// declare interface IControllerResult {
// 	// /**
// 	//  * True if response has been already ended from controller manualy.
// 	//  */
// 	// responseEnded: boolean;
//
// 	/**
// 	 * Path of view which should be used
// 	 */
// 	view: string;
// }