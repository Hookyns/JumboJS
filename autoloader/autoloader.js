/**
 * Autoloader is script which walk through core and application folders
 * and find all classes which then insert into global Jumbo namespace.
 * Script not require() files nor open them, just read their names.
 * Script create getters in namespace Jumbo and just after calling that getter file'll be required().
 * So using Jumbo namespace is lazy and cached thanks to require() cache.
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

const $cluster = require("cluster");
const $path = require("path");
const $fs = require("fs");
const $clusterCmds = require("jumbo-core/cluster/cluster-messaging");

// Regex matching filenames which should autoloaded
const FILE_NAME_REGEX = /^[A-Z].*\.(js)$/;

// Regex matching extensions - used for extension removing
const EXTENSION_REGEX = /\.(js)$/;

// Convert file name to upper camel case
function toCamelCase(fileName) {
	return (fileName.charAt(0).toUpperCase() + fileName.substr(1)).replace(/-(.)/g, function (_, upChar) {
		return upChar.toUpperCase();
	});
}

// Create function for recursive walk-through
function loadDir(dir) {
	let result = {};
	let list = $fs.readdirSync(dir);
	let name;

	list.forEach(function (fileName) {
		if (fileName.charAt(0) === "." || fileName === "node_modules") return;

		let file = $path.resolve(dir, fileName);
		let stat = $fs.lstatSync(file);

		if (stat) {
			if (stat.isDirectory()) {
				let ns = loadDir(file);
				name = toCamelCase(fileName);
				result[name] = ns;

				if ($cluster.isWorker && file.slice(0, Jumbo.APP_DIR.length) === Jumbo.APP_DIR) {
					// Enable watching over app directory - reload after some change
					let nextChangeAfter = null;

					$fs.watch(file, function (event, fileName) {
						if (fileName.slice(-3) !== ".js") return;

						// Cuz some systems emit more messages for one event
						setTimeout(async() => {
							if (nextChangeAfter !== null && (new Date()).getTime() < nextChangeAfter) return;
							nextChangeAfter = new Date().getTime() + 1000;

							let classPath = $path.join(file, fileName);
							let cls = fileName.replace(EXTENSION_REGEX, "");

							let inNS = ns.hasOwnProperty(cls);

							// Check if changed file was deleted or not
							let removed = inNS ? await new Promise((c) => {
								$fs.access(classPath, (err) => {
									c(!!err)
								});
							}) : false;

							// // New file added - reload process
							$clusterCmds.invoke($clusterCmds.Commands.RestartWorker);

							Jumbo.Logging.Log.line(`File ${classPath} ${removed ? "removed" : (inNS ? "changed" : "added")} - reload`,
								Jumbo.Logging.Log.LogTypes.Std, Jumbo.Logging.Log.LogLevels.Talkative);
						}, 1000);
					});
				}
			} else if (stat.isFile()) {
				if (FILE_NAME_REGEX.test(fileName)) {
					let cls = fileName.replace(EXTENSION_REGEX, "");

					if (cls.toLowerCase() === "publiccontroller") {
						console.error("It's not possible to name controller 'Public'" +
							" because /public is used to detect static files. " +
							$path.join(dir, fileName));
					}

					// define getter which provide lazy loading
					Object.defineProperty(result, cls, {
						enumerable: true,
						get: function () {
							let req = require(file);
							return req["default"] || req[cls] || req;
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
	App: loadDir(Jumbo.APP_DIR),
	loadDir: loadDir
};