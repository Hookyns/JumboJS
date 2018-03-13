/**
 * Define commands which are used in communication between clusters
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

/**
 * Invoke command on all workers
 * @param {Commands} cmd
 * @param {Object} [data]
 */
export function invoke(cmd, data = null) {
	process.send({
		invokeAction: cmd,
		invokeData: data
	});
}

export const Commands = {
	/** @type {Commands} */
	Log: 0,
	/** @type {Commands} */
	BanIp: 1,
	/** @type {Commands} */
	NewSession: 2,
	/** @type {Commands} */
	WorkerReady: 3,
	/** @type {Commands} */
	ExitApp: 4,
	/** @type {Commands} */
	RestartWorker: 5
};

export const ExitCommands = {
	/** @type {ExitCommands} */
	Exit: 0,
	/** @type {ExitCommands} */
	Restart: 1
};
