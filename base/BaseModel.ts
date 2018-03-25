/**
 * @memberOf Jumbo.Base
 */
class BaseModel {

	//region Fields

	/**
	 * Is model valid?
	 */
	private _isValid: boolean;

	/**
	 * Validator for this model
	 * @type {Jumbo.Validation.Validator}
	 */
	static validator = null;

	//endregion

	//region Properties

	/**
	 * Is model valid?
	 * @returns {boolean}
	 */
	public get isValid(): boolean {
		return this._isValid;
	}

	//endregion

	//region Ctors

	constructor() {
		this._isValid = true;
	}

	//endregion
}