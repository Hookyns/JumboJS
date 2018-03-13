/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

//region Imports

import * as $fs from "fs";
import * as $path from "path";
import * as $cluster from "cluster";
import * as $clusterCmds from "../cluster/cluster-messaging";

//endregion

//region Consts

const $newLine = require("os").EOL;
const $cfg = require("jumbo-core/config").Configurations;
const config = Jumbo.config;

/**
 * Types of log messages
 * @memberOf Jumbo.Logging
 */
export enum LogTypes {
	Http = "http",
	Std = "std",
	Start = "start"
}

/**
 * Log levels
 * @memberOf Jumbo.Logging
 */
export enum LogLevels {
	Error = 1,
	Warning = 2,
	Normal = 3,
	Talkative = 4,
	TalkativeCluster = 5
}

//endregion

/**
 * Static class for logging
 * @class
 * @memberOf Jumbo.Logging
 */
export class Log
{
	//region Static Properties

	/**
	 * Is log already iniciated?
	 */
	private static isInitiated: boolean = false;

	/**
	 * Logging dir
	 */
	private static dir: string = Jumbo.LOG_DIR;

	/**
	 * Time stamp, marking log file name
	 */
	private static which: string = null;

	/**
	 * Logging level, taken from config
	 * @type {Configurations.LogLevels}
	 */
	static level = config.log.level;

	/**
	 * Return LogLevels enum
	 * @returns {LogLevels}
	 */
	static get LogLevels(): typeof LogLevels {
		return LogLevels;
	}

	/**
	 * Return LogTypes enum
	 * @returns {LogTypes}
	 */
	static get LogTypes(): typeof LogTypes {
		return LogTypes;
	}

	/**
	 * You can change how you want to log; set custom handler to this property
	 */
	static logFunction: (message, type) => void = function (message, type) {
		//noinspection JSUnresolvedFunction
		message = Log.curTime() + " [" + type.toUpperCase() + "] " + message;

		if (Jumbo.config.deployment == $cfg.Deployment.Development)
		{
			console.log(message);
		}

		if (Log.isInitiated)
		{
			$fs.appendFile($path.resolve(Log.dir, type + "-" + Log.which + ".log"), message + $newLine, function (err) {
				if (err != null)
				{
					console.error("Error ocurs while writing into log.\n" + err);
				}
			});
		}
	};

	//endregion

	//region Public methods

	/**
	 * Log error
	 * @param message Message to log
	 * @param {LogTypes} [type] Log type
	 * @param {LogLevels} [level] Log level
	 */
	static error(message, type = undefined, level = LogLevels.Error)
	{
		Log.line("ERROR: " + message, type, level);
	}

	/**
	 * Log warning
	 * @param message Message to log
	 * @param {LogTypes} [type] Log type
	 * @param {LogLevels} [level] Log level
	 */
	static warning(message, type = undefined, level = LogLevels.Warning)
	{
		Log.line("WARNING: " + message, type, level);
	}

	/**
	 * Log line
	 * @param message Message to log
	 * @param {LogTypes} [type] Log type
	 * @param {LogLevels} [level] Log level
	 */
	static line(message, type = LogTypes.Std, level = LogLevels.Normal)
	{
		if (!Jumbo.config.log.enabled)
		{
			return;
		}

		if (level <= Log.level)
		{
			if ($cluster.isMaster)
			{
				Log.logFunction(message, type);
			}
			else
			{
				message = "[Worker " + $cluster.worker.id + "] " + message;
				$clusterCmds.invoke($clusterCmds.Commands.Log, {
					message: message,
					type: type,
					level: level
				});
			}
		}
	}

	//endregion

	//region Private methods

	/**
	 * Return actual formated time
	 * @private
	 * @returns {string}
	 */
	static curTime()
	{
		let d = new Date();

		function edit(a)
		{
			return a.toString().length === 1 ? ("0" + a) : a;
		}

		return d.getFullYear() + "-" + edit(d.getMonth()) + "-" + edit(d.getDate())
			+ " " + edit(d.getHours()) + ":" + edit(d.getMinutes()) + ":" + edit(d.getSeconds());
	}

	/**
	 * Initialize log
	 * @private
	 */
	static init()
	{
		if (config.log.enabled === true)
		{
			if ($fs.lstatSync(Log.dir).isDirectory())
			{
				this.which = this.curTime().replace(/[: ]/g, "-");
				this.isInitiated = true;
			}
		}
	}

	//endregion
}

/**
 * Log Initialization
 */
//noinspection JSAccessibilityCheck
Log.init();