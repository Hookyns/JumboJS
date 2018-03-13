declare interface ITemplateAdapter
{
	/**
	 * Compile and render template
	 * @param {string} templatePath
	 * @param {string} layoutPath
	 * @param {string} dynamicLayout
	 * @param data
	 * @param context
	 */
	render(templatePath: string, layoutPath: string, dynamicLayout: string, data: any, context: any): Promise<string>;

	/**
	 * Precompile template
	 * @param {string} templatePath
	 * @param {string} layoutPath
	 * @param {string} dynamicLayout
	 */
	preCompile(templatePath: string, layoutPath: string, dynamicLayout: string): Promise<string>;

	/**
	 * Render precompiled template
	 * @param {string} compiledTemplate
	 * @param data
	 * @param context
	 */
	renderPreCompiled(compiledTemplate: string, data: any, context: any): Promise<string>;

	/**
	 * Extension for template files
	 */
	extension: string;

	/**
	 * Set true if you implement preCompile and renderPreCompiled methods
	 */
	preCompilation: boolean;
}

declare interface IState {
	/**
	 * Can calling context continue?
	 */
	canContinue: boolean;

	/**
	 * Errors
	 */
	errors: Array<Error>;
}

declare interface IBody {
	fields: {[fieldName: string]: any};
	files: {[fileName: string]: any};
}