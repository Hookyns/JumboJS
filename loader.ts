/**
 * This file is initializer which prepare all application stuff and create new instance of Application
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

import * as $cluster from "cluster"
import * as $path from "path";
import * as $fs from "fs";
import * as ObjectUtils from "jumbo-core/utils/object";

// Default config values
let defaultConfig = require("jumbo-core/default-config.js");

// Start timer measuring application load time
if ($cluster.isMaster) {
	console.time("Application Master load-time: ");
} else {
	console.time("Application Worker " + $cluster.worker.id + " load-time: ");
}

/**
 * Base project directory
 * @type {string}
 */
const PROJECT_DIR = $path.dirname(require.main.filename);

/**
 * Number of milisecond in day
 * @type {number}
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * List of folders which should Jumbo application contains
 */
const FRAMEWORK_FOLDER_STRUCTURE = [
	$path.join(PROJECT_DIR, "app"),
	$path.join(PROJECT_DIR, "app", "controllers"),
	$path.join(PROJECT_DIR, "app", "sub-apps"),
	$path.join(PROJECT_DIR, "app", "services"),
	$path.join(PROJECT_DIR, "app", "models"),
	$path.join(PROJECT_DIR, "app", "templates"),
	$path.join(PROJECT_DIR, "app", "tests"),

	$path.join(PROJECT_DIR, "data"),
	$path.join(PROJECT_DIR, "data", "uploads"),
	$path.join(PROJECT_DIR, "data", "logs"),
	$path.join(PROJECT_DIR, "data", "errors"),

	$path.join(PROJECT_DIR, "public"),
	// $path.join(base, "public", "styles"),
	// $path.join(base, "public", "scripts"),
	// $path.join(base, "public", "images"),

	$path.join(PROJECT_DIR, "temp"),
	$path.join(PROJECT_DIR, "temp", "cache"),
	$path.join(PROJECT_DIR, "temp", "sessions")
];

/**
 * Declaration of global object/namespace Jumbo which represents
 * base framework object for accessing framework data
 * @namespace Jumbo
 * @global
 */
const Jumbo: JumboNamespace = {
	/** @type {defaultConfig} */
	config: {},
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
	CACHE_DIR: $path.resolve(PROJECT_DIR, "temp", "cache"),
	SESSION_DIR: $path.resolve(PROJECT_DIR, "temp", "sessions"),

	Application: {},
	Adapters: {},
	Autoloader: {},
	Base: {},
	Cluster: {},
	Exceptions: {},
	Ioc: {},
	Logging: {},
	Sync: {},
	Utils: {},
	Validation: {},
};

(<any>global).Jumbo = Jumbo;

class Loader {
	//region Fields

	/**
	 * Is true if something went wrong. Application will be closed when loader finish.
	 * @type {boolean}
	 */
	private exitStatus: boolean = false;

	/**
	 * Config; Filled from checkConfig()
	 * @type {defaultConfig}
	 */
	private config: any;

	//endregion

	//region Static methods

	/**
	 * Initialize application
	 */
	public static initializeApplication() {
		let loader = new Loader();
		loader.initialize();

		if ($cluster.isMaster) {
			loader.deleteCachedFiles();
			loader.deleteOldSessions();
		}

		loader.initAutoloader();

		const Application = require("jumbo-core/application/Application").Application;
		// Create instance of application
		let app = Application.instance;
		(<any>global).Application = app;

		// // Export application
		// module.exports = {
		// 	/**
		// 	 * @type {Jumbo.Application.Application}
		// 	 */
		// 	application: app,
		//
		// 	/**
		// 	 * @type {JumboNamespace}
		// 	 */
		// 	Jumbo: Jumbo
		// };

		// Additional global objects
		(<any>global).nameof = function nameof(obj) {
			return Object.keys(obj)[0];
		};
	}

	//endregion

	//region Methods

	/**
	 * Delete cached filed
	 */
	public deleteCachedFiles() {
		$fs.readdir(Jumbo.CACHE_DIR, (err, files) => {
			let i = 0;

			for (let fileName of files) {
				if (fileName.slice(-9) == ".tplcache") {
					let file = $path.join(Jumbo.CACHE_DIR, fileName);

					// remove file
					$fs.unlink(file, () => { });

					i++;
				}
			}

			Jumbo.Logging.Log.line(`${i} cached template files deleted`);
		});
	}

	/**
	 * Delete old sessions
	 */
	public deleteOldSessions() {
		$fs.readdir(Jumbo.SESSION_DIR, (err, files) => {
			let sessionLimitTime = (new Date().getTime() - Jumbo.config.session.sessionLifetime * DAY_MS);

			for (let fileName of files) {
				if (fileName.slice(-8) == ".session") {
					let file = $path.join(Jumbo.SESSION_DIR, fileName);
					let stats = $fs.statSync(file);

					if (stats.birthtime.getTime() < sessionLimitTime) {
						// remove session file
						// noinspection JSUnusedLocalSymbols
						$fs.unlink(file, (err) => {});

						Jumbo.Logging.Log.line(`Deleting session file '${fileName}'`);
					}
				}
			}
		});
	}

	/**
	 * Initialize autoloader
	 */
	public initAutoloader() {
		// Load the Autoloader
		const autoloader = require("jumbo-core/autoloader/autoloader");

		/**
		 * @namespace App
		 * @global
		 */
		(<any>global).App = autoloader.App;

		// Add items from core directory to namespace/object Jumbo
		let objs = Object.getOwnPropertyNames(autoloader.Core);
		let c = objs.length;
		for (let p = 0; p < c; p++) {
			Jumbo[objs[p]] = autoloader.Core[objs[p]];
		}
	}

	/**
	 * Provede inicializaci
	 */
	public initialize() {
		this.checkConfig();
		this.checkAppStructure();

		if (this.exitStatus) {
			process.exit(0);
		}
	}

	//endregion

	//region Private methods

	/**
	 * Check that all framework directories exists
	 */
	private checkAppStructure() {
		FRAMEWORK_FOLDER_STRUCTURE.forEach(function (p) {
			try {
				let stat = $fs.lstatSync(p);

				if (!stat.isDirectory()) {
					console.error(`[ERROR] Structure directory '${p}' not found.`);
					this.exitStatus = true;
				}
			} catch (ex) {
				this.exitStatus = true;
			}
		});
	}

	private isInConfig(section, ...properties) {
		let sect = this.config[section];
		let succ = true;

		if (sect === undefined) {
			console.error(`[ERROR] Config file is corrupted. Section '${section}' is missing.`);
			succ = false;
		} else {
			for (let prop in properties) {
				prop = properties[prop];

				if (!sect.hasOwnProperty(prop)) {
					console.error(`[ERROR] Config file is corrupted. Property '${prop}' is missing in section '${section}'.`);
					succ = false;
				}
			}
		}

		return succ;
	}

	/**
	 * Load config, check it and prepare object with readonly properties and put it into global Jumbo
	 */
	private checkConfigSections() {
		if (
			this.isInConfig("protocol", "protocol", "privateKey", "certificate", "pfx", "passphrase")
			&& this.isInConfig("clustering", "numberOfWorkers")
			&& this.isInConfig("cache", "enabled", "memoryCacheSizeLimit")
			&& this.isInConfig("session", "sessionsCookieName", "sessionLifetime", "memorySizeLimit", "justInMemory")
			&& this.isInConfig("log", "enabled", "level")
			&& this.isInConfig("doTestsAfterRun")
			&& this.isInConfig("maxRequestPerSecond")
			&& this.isInConfig("maxPostDataSize")
			&& this.isInConfig("deployment")
			&& this.isInConfig("debugMode")
			&& this.isInConfig("DOSPrevention", "enabled", "blockTime", "maxRequestPerIP")
			&& this.isInConfig("globalization", "enabled", "defaultLanguage")
		) {
			Jumbo.config = ObjectUtils.freeze(this.config, 2);
		} else {
			// ...
		}
	}

	/**
	 * Check that config exists
	 */
	private checkConfig() {
		let confPath = $path.join(PROJECT_DIR, "config.js");

		if (!$fs.lstatSync(confPath).isFile()) {
			this.exitStatus = true;
			console.error("Application config '" + confPath + "' not found.");
		}

		try {
			this.config = ObjectUtils.assign(defaultConfig, require(confPath));
			this.checkConfigSections();
		} catch (ex) {
			this.exitStatus = true;
			console.error("Config JSON invalid.", ex);
		}
	}

	//endregion
}

console.log("*******************************");
console.log("**");
console.log("** JumboJS, booting up...");
console.log("**");
console.log("*******************************");

Loader.initializeApplication();

import {Application} from "./application/Application";
export const application: Application = (<any>global).Application;