/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

const {Jumplate} = require("jumbo-template");

//region Template setup

Jumplate.debugMode = Jumbo.config.debugMode;
// Jumplate.setTimeZone("UTC");

//endregion

//region Helpers

/**
 * LINK helper
 * Create application link
 */
Jumplate.registerHelper("link", function (action, controller, params, locale) {
	if (!locale) {
		locale = this.request.locale;
	}

	return this.url.action(action, controller)
		.params(params)
		.locale(locale)
		.getUrl();
});

/**
 * LOCATIONLINK helper
 * Create application location link
 */
Jumplate.registerHelper("locationLink", function (locationName, action, controller, params, locale) {
	if (!locale) {
		locale = this.request.locale;
	}

	return this.url.action(action, controller)
		.params(params)
		.locale(locale)
		.location(locationName)
		.getUrl();
});

/**
 * APPLINK helper
 * Create application link targeted to subbapp
 */
Jumplate.registerHelper("applink", function (subApp, action, controller, params, locale) {
	if (!locale) {
		locale = this.request.locale;
	}

	return this.url.action(action, controller)
		.subApp(subApp)
		.locale(locale)
		.params(params)
		.getUrl();
});

/**
 * FORM helper
 */
Jumplate.registerBlockHelper("form", function (content) {
	return '<form method="POST" action="#" enctype="multipart/form-data">' + content + '</form>';
});

Jumplate.registerHelper("json", function (obj) {
	return JSON.stringify(obj);
});

Jumplate.registerLocalizator(function (key) {
	console.log("Implement localizator in TemplateAdapter!");
	return key;
});

//endregion

/**
 * Integrated template adapter for Jumplate
 * @memberOf Jumbo.Adapters
 */
const TemplateAdapter = {

	render: async function render(templatePath, layoutPath, dynamicLayout, data, context/*: Controller*/) {
		return await new Promise((resolve, reject) => {
			let template = new Jumplate(null, templatePath, dynamicLayout || null, layoutPath);
			template.setLocale(context.request.locale);
			template.context = context;
			template.compile(function (err) {
				if (err) {
					return reject(err);
				}

				template.render(data, function (err, output) {
					if (err) {
						return reject(err);
					}

					resolve(output);
				});
			});
		});
	},

	preCompile: async function preCompile(templatePath, layoutPath, dynamicLayout) {
		return await new Promise((resolve, reject) => {
			let template = new Jumplate(null, templatePath, dynamicLayout || null, layoutPath);
			template.compile(function (err, preCompiledTemplate) {
				if (err) {
					reject(err);
					return;
				}

				resolve(preCompiledTemplate);
			});
		});
	},

	renderPreCompiled: async function renderPreCompiled(compiledTemplate, data, context) {
		return new Promise((resolve, reject) => {
			let template = Jumplate.fromCache(compiledTemplate);
			template.setLocale(context.request.locale);
			template.context = context;
			template.render(data, function (err, output) {
				if (err) {
					return reject(err);
				}

				resolve(output);
			});
		});
	},

	/**
	 * Extension of template files
	 */
	extension: ".jshtml",

	/**
	 * You implement preCompile and renderPreCompiled methods
	 */
	preCompilation: true
};

module.exports = TemplateAdapter;