/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

const {Jumplate} = require("jumbo-template");

if (Jumbo.config.debugMode) {
	Jumplate.debugMode = true;
}

//region Helpers

/**
 * LINK helper
 * Create application link
 */
Jumplate.registerHelper("link", function (controller, action, params = {}, lang) {
	if (!lang) {
		lang = this.request.language;
	}

	// return Jumbo.Application.Locator.prototype.generateUrl.call(Jumbo.Application.Locator.instance,
	// 	controller, action, slashParams, queryParams, null, lang);

	return this.url.action(action, controller)
		.params(params)
		.language(lang)
		.getUrl();
});

/**
 * APPLINK helper
 * Create application link targeted to subbapp
 */
Jumplate.registerHelper("applink", function (subApp, controller, action, params = {}, lang) {
	if (!lang) {
		lang = this.request.language;
	}

	return this.url.action(action, controller)
		.subApp(subApp)
		.params(params)
		.language(lang)
		.getUrl();

	// return Jumbo.Application.Locator.prototype.generateUrl.call(Jumbo.Application.Locator.instance,
	// 	controller, action, slashParams, queryParams, subApp, lang);
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

	render: async function render(templatePath, layoutPath, dynamicLayout, data, context) {
		return await new Promise((resolve, reject) => {
			let template = new Jumplate(null, templatePath, dynamicLayout || null, layoutPath);
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
					return reject(err);
				}

				resolve(preCompiledTemplate);
			});
		});
	},

	renderPreCompiled: async function renderPreCompiled(compiledTemplate, data, context) {
		return new Promise((resolve, reject) => {
			let template = Jumplate.fromCache(compiledTemplate);
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
	extension: ".tpl",

	/**
	 * You implement preCompile and renderPreCompiled methods
	 */
	preCompilation: true
};

module.exports = TemplateAdapter;