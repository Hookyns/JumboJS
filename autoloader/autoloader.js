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
const {cluster, ClusterCommands} = require("jumbo-core/cluster/Cluster");
const $os = require("os");

// Regex matching filenames which should autoloaded
const FILE_NAME_REGEX = /^[A-Z].*\.(js)$/;

// Regex matching extensions - used for extension removing
const EXTENSION_REGEX = /\.(js)$/;

const IS_WIN32 = $os.platform() === "win32";

// Convert file name to upper camel case
function toCamelCase(fileName) {
	return (
		fileName.charAt(0).toUpperCase() + fileName.substr(1)
	).replace(/[-_](.)/g, function (_, upChar) {
		return upChar.toUpperCase();
	});
}

async function watchAppDir(file, ns) {
	if (file.slice(0, Jumbo.APP_DIR.length) === Jumbo.APP_DIR) {
		// Enable watching over app directory - reload after some change
		let nextChangeAfter = null;

		$fs.watch(file, function (event, fileName) {
			if (fileName.slice(-3) !== ".js") return;

			// Cuz some systems emit more messages for one event
			setTimeout(async () => {
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

				// New file added - reload process
				cluster.invoke(ClusterCommands.RestartWorker);

				Jumbo.Logging.Log.line(`File ${classPath} ${removed ? "removed" : (inNS ? "changed" : "added")} - reload`,
					Jumbo.Logging.Log.LogTypes.Std, Jumbo.Logging.Log.LogLevels.Talkative);
			}, 1000);
		});
	}
}

// Create function for recursive walk-through
function loadDir(dir) {
	let result = {};
	let list = $fs.readdirSync(dir);
	let name;

	list.forEach(function (fileName) {
		if (fileName.charAt(0) === "." || fileName === "node_modules") return;

		let filePath = $path.resolve(dir, fileName);

		// Update drive letter case on Windows
		if (IS_WIN32) {
			filePath = filePath.charAt(0).toUpperCase() + filePath.slice(1);
		}

		let stat = $fs.lstatSync(filePath);

		if (stat) {
			if (stat.isDirectory()) {
				let ns = loadDir(filePath);
				name = toCamelCase(fileName);
				result[name] = ns;
				if ($cluster.isWorker) watchAppDir(filePath, ns);
			} else if (stat.isFile()) {
				if (FILE_NAME_REGEX.test(fileName)) {
					let cls = fileName.replace(EXTENSION_REGEX, "");

					if (cls.toLowerCase() === "publiccontroller") {
						console.error("It's not possible to name controller 'Public'" +
							" because /public is used to detect static files. " +
							$path.join(dir, fileName));
					}

					// let pathRelative = $path.relative(__dirname, file);

					// define getter which provide lazy loading
					Object.defineProperty(result, cls, {
						enumerable: true,
						get: function () {
							let req = require(filePath);
							return req[cls] || req["default"] || req;
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