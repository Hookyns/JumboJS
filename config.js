//noinspection JSValidateTypes
/**
 * @name Configurations
 */
var Configurations = {
	Protocols: {
		/** @type {Configurations.Protocols} */
		Http: 0,
		/** @type {Configurations.Protocols} */
		Https: 1
	},

	Cache: {
		/** @type {Configurations.Cache} */
		InMemory: 0,
		/** @type {Configurations.Cache} */
		HardDrive: 1
	},

	LogLevels: {
		/** @type {Configurations.LogLevels} */
		Error: 1,
		/** @type {Configurations.LogLevels} */
		Warning: 2,
		/** @type {Configurations.LogLevels} */
		Normal: 3,
		/** @type {Configurations.LogLevels} */
		Talkative: 4
	},

	Deployment: {
		/** @type {Configurations.Deployment} */
		Development: 0,
		/** @type {Configurations.Deployment} */
		Production: 1
	}
};

module.exports = Configurations;