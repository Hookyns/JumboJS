/**
 * Autoloader is script which walk through core and application folders
 * and find all classes which then insert into global Jumbo namespace.
 * Script not require() files nor open them, just read their names.
 * Script create getters in namespace Jumbo and just after calling that getter file'll be required().
 * So using Jumbo namespace is lazy and cached thanks to require() cache.
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */

const $fs = require("fs");
const $path = require("path");
const $cluster = require("cluster");

// Add support for .class extension
require.extensions['.class'] = require.extensions['.js'];

// Create function for recursive walk-through
function loadDir(dir) {
	var result = {};
	var list = $fs.readdirSync(dir);

	list.forEach(function (fileName) {
		var file = $path.resolve(dir, fileName);
		var stat = $fs.lstatSync(file);
		var name;

		if (stat) {
			if (stat.isDirectory()) {
				// Convert directory name to namespace-like name
				name = (fileName.charAt(0).toUpperCase() + fileName.substr(1)).replace(/-(.)/g, function (_, upChar) {
					return upChar.toUpperCase();
				});
				result[name] = loadDir(file);

				if ($cluster.isWorker && file.slice(0, Jumbo.APP_DIR.length) == Jumbo.APP_DIR) {
					// Enable watching over app directory - reload after some change
					var nextChangeAfter = null;
					$fs.watch(file, function (event, fileName) {
						if (fileName.slice(-6) != ".class" && fileName.slice(-3) != ".js") return;

						// Windows emit rename for change so all event types must be accepted
						// if (event != "change") return;

						// Cuz some systems emit more messages for one event
						setTimeout(() => {
							if (nextChangeAfter != null && (new Date()).getTime() < nextChangeAfter) return;
							nextChangeAfter = new Date().getTime() + 1000;

							file = $path.join(file, fileName);

							// If will file changed, it'll be deleted from require cache and loaded again after somebody call created namespace accessor
							Jumbo.Logging.Log.line("File " + file + " changed - reload",
								Jumbo.Logging.Log.LogTypes.Std, Jumbo.Logging.Log.LogLevels.Talkative);

							delete require.cache[file];
						});
					});
				}
			} else if (stat.isFile()) {
				// If first letter is big it's class
				if (/^[A-Z].*\.((js)|(class))/.test(fileName)) {
					var cls = fileName.replace(/\.((js)|(class))$/, "");

					//noinspection JSAccessibilityCheck
					if (cls.toLowerCase() == "publiccontroller") {
						console.error("It's not posible to name controller 'Public'" +
							" because /public is used to detect static files. " +
							$path.join(dir, fileName));
					}

					// define getter which provide lazy loading
					Object.defineProperty(result, cls, {
						get: function () {
							return require(file);
						}
					});
				}
			}
		}
	});

	return result;
}

module.exports = {
	Core: loadDir(Jumbo.CORE_DIR),
	App: loadDir(Jumbo.APP_DIR)
};
