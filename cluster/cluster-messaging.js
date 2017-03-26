//noinspection JSValidateTypes
/**
 * Define commands which are used in communication between clusters
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */

var ClusterCommands = {
	/**
	 *
	 * @param {ClusterCommands.Commands} cmd
	 * @param {Object} [data]
	 * @return {{invokeAction: ClusterCommands.Commands, invokeData: Object}}
	 */
	invoke: function (cmd, data = null) {
		process.send({
			invokeAction: cmd,
			invokeData: data
		});
	},

	Commands: {
		/** @type {ClusterCommands.Commands} */
		Log: 0,
		/** @type {ClusterCommands.Commands} */
		BanIp: 1,
		/** @type {ClusterCommands.Commands} */
		NewSession: 2,
		/** @type {ClusterCommands.Commands} */
		WorkerReady: 3,
		/** @type {ClusterCommands.Commands} */
		ExitApp: 4
	}
};

module.exports = ClusterCommands;