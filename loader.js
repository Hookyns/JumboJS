/**
 * This file is initializer which prepare all application stuff and create new instance of Application
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */

$cluster = require("cluster");

// Start timer measuring application load time
if ($cluster.isMaster) {
	console.time("Application Master load-time: ");
} else {
	console.time("Application Worker " + $cluster.worker.id + " load-time: ");
}


const $path = require("path");
const $fs = require("fs");

// Declare project directory path
const PROJECT_DIR = $path.resolve(__dirname, "..", "..");

// Check framework structure
(function() {
	var base = PROJECT_DIR;
	var err = false;
	var localErr = false;

	// List of framework structure folders
	var a = [
		$path.join(base, "app"),
		$path.join(base, "app", "controllers"),
		$path.join(base, "app", "sub-apps"),
		$path.join(base, "app", "services"),
		$path.join(base, "app", "models"),
		$path.join(base, "app", "templates"),
		$path.join(base, "app", "tests"),

		$path.join(base, "data"),
		$path.join(base, "data", "uploads"),
		$path.join(base, "data", "logs"),
		$path.join(base, "data", "errors"),

		$path.join(base, "public"),
		$path.join(base, "public", "styles"),
		$path.join(base, "public", "scripts"),
		$path.join(base, "public", "images"),


		$path.join(base, "temp"),
		$path.join(base, "temp", "cache"),
		$path.join(base, "temp", "sessions")
	];

	// Check that all framework directories exists
	a.forEach(function(p) {
		try {
			var stat = $fs.lstatSync(p);

			if (!stat.isDirectory()) {
				err = true;
				localErr = true;
			}
		} catch (ex) {
			err = true;
			localErr = true;
		}

		if (localErr) {
			console.error("Structure directory '" + p + "' not found.");
			localErr = false;
		}
	});

	// Check if config exists
	var confPath = $path.join(base, "config.js");

	if (!$fs.lstatSync(confPath).isFile()) {
		err = true;
		console.error("Application config '" + confPath + "' not found.");
	}

	try {
		require(confPath);
	} catch (ex) {
		err = true;
		console.error("Config has bad format.");
	}

	if (err == true) {
		process.exit(0);
	}
})();

/**
 * Declaration of global object/namespace Jumbo which represents
 * base framework object for accessing framework data
 * @namespace Jumbo
 * @global
 */
var Jumbo = {
	/**
	 * @memberOf Jumbo
	 * @static
	 * @type {ApplicationConfig}
	 */
	Config: {},
	CONFIG_PATH: $path.join(PROJECT_DIR, "config.js"),
	CFG_PATH: $path.join(__dirname, "config.js"),
	BASE_DIR: PROJECT_DIR,
	CORE_DIR: __dirname,
	PUBLIC_DIR: $path.join(PROJECT_DIR, "public"),
	APP_DIR: $path.join(PROJECT_DIR, "app"),
	SUB_APP_DIR: $path.join(PROJECT_DIR, "app", "sub-apps"),
	ERR_DIR: $path.join(PROJECT_DIR, "data", "errors"),
	LOG_DIR: $path.join(PROJECT_DIR, "data", "logs"),
	UPLOAD_DIR: $path.resolve(PROJECT_DIR, "data", "uploads"),
	CACHE_DIR: $path.resolve(PROJECT_DIR, "temp" , "cache"),
	SESSION_DIR: $path.resolve(PROJECT_DIR, "temp" , "sessions")
};

// Load config, check it and prepare object with readonly properties and put it into global Jumbo
(function() {
	var config = require(Jumbo.CONFIG_PATH);

	if (
		config.protocol
		&& config.protocol.hasOwnProperty("protocol")
		&& config.protocol.hasOwnProperty("privateKey")
		&& config.protocol.hasOwnProperty("certificate")
		&& config.protocol.hasOwnProperty("pfx")
		&& config.protocol.hasOwnProperty("passphrase")

		&& config.clustering
		&& config.clustering.hasOwnProperty("numberOfWorkers")

		&& config.cache
		&& config.cache.hasOwnProperty("enabled")
		// && config.cache.hasOwnProperty("storage")
		&& config.cache.hasOwnProperty("memoryCacheSizeLimit")

		&& config.session
		&& config.session.hasOwnProperty("sessionsCookieName")
		&& config.session.hasOwnProperty("sessionLifetime")
		&& config.session.hasOwnProperty("memorySizeLimit")
		&& config.session.hasOwnProperty("justInMemory")

		&& config.log
		&& config.log.hasOwnProperty("enabled")
		&& config.log.hasOwnProperty("level")

		&& config.hasOwnProperty("doTestsAfterRun")
		&& config.hasOwnProperty("maxRequestPerSecond")
		&& config.hasOwnProperty("maxPostDataSize")
		&& config.hasOwnProperty("deployment")
		&& config.hasOwnProperty("debugMode")

		&& config.DOSPrevention
		&& config.DOSPrevention.hasOwnProperty("enabled")
		&& config.DOSPrevention.hasOwnProperty("blockTime")
		&& config.DOSPrevention.hasOwnProperty("maxRequestPerIP"))
	{
		Jumbo.Config = require("./utils/object").getReadonlyVariant(config);
	} else {
		console.log("[ERROR] Config file is corrupted, some required items missing.");
	}
})();

// Add Jumbo to global
global.Jumbo = Jumbo;

// Load the Autoloader
const autoloader = require("./autoloader/autoloader.js");

/**
 * Add Application namespace from autoloader to global namespace App
 * @global
 * @namespace App
 */
global.App = { // Dummy declaration for IDEs
	/**
	 * @namespace
	 */
	Controllers: {},

	/**
	 * @namespace
	 */
	Models: {},

	/**
	 * @namespace
	 */
	Services: {},

	/**
	 * @namespace
	 */
	SubApps: {},

	/**
	 * @namespace
	 */
	Tests: {},

	/**
	 * @namespace
	 */
	Validators: {},
};

/**
 * @alias App
 */
global.App = autoloader.App;

// Add items from core directory to namespace/object Jumbo
(function() {
	var objs = Object.getOwnPropertyNames(autoloader.Core);
	var c = objs.length;
	for (var p = 0; p < c; p++) {
		global.Jumbo[objs[p]] = autoloader.Core[objs[p]];
	}
})();

// Create instance of application
var app = new Jumbo.Application.Application();

/**
 * @ignore
 * @type {Jumbo.Application.Application}
 */
global.Application = app;

if ($cluster.isMaster) {
	// Delete old sessions
	$fs.readdir(Jumbo.SESSION_DIR, (err, files) => {
		for (var fileName of files) {
			if (fileName.slice(-8) == ".session") {
				let file = $path.join(Jumbo.SESSION_DIR, fileName);
				let stats = $fs.statSync(file);

				if (stats.birthtime.getTime() < (new Date().getTime()
					- Jumbo.Config.session.sessionLifetime * 24 * 60 * 60 * 1000))
				{
					// remove session file
					$fs.unlink(file, (err) => { });
					
					Jumbo.Logging.Log.line(`Deleting session file '${fileName}'`);
				}
			}
		}
	});

	// Delete cached files
	$fs.readdir(Jumbo.CACHE_DIR, (err, files) => {
		var i = 0;

		for (var fileName of files) {
			if (fileName.slice(-9) == ".tplcache") {
				let file = $path.join(Jumbo.CACHE_DIR, fileName);

				// remove file
				$fs.unlink(file, (err) => { });

				i++;
			}
		}

		Jumbo.Logging.Log.line(`${i} cached template files deleted`);
	});
}


// TODO: Future test support will be here


// Export application
module.exports = {
	/**
	 * @type Jumbo.Application.Application
	 */
	application: app
};
