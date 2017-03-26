/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */


/**
 * @memberOf Jumbo.Utils
 * @static Crypt
 */
var UtilsCrypt = {
	/**
	 * Generate UID - unique ID which is not tested but is unique, getting duplicity is quite imposible
	 * 640 000 UIDs per second in one 2,33 GHz core
	 */
	uid: function uid() {
		var rand = Math.random().toString();
		var time = new Date().getTime().toString();
		const gen = "ABCDEFwxyz";

		return time[0] + gen[rand[2]]
			+ time[1] + gen[rand[3]]
			+ time[2] + gen[rand[4]]
			+ time[3] + gen[rand[5]]
			+ "-"
			+ time[4] + gen[rand[6]]
			+ time[5] + gen[rand[7]]
			+ time[6] + gen[rand[8]]
			+ "-"
			+ time[7] + gen[rand[9]]
			+ time[8] + gen[rand[10]]
			+ time[9] + gen[rand[11]]
			+ "-"
			+ time[10] + gen[rand[12]]
			+ time[11] + gen[rand[13]]
			+ time[12] + gen[rand[14]]
			+ rand[2] + rand[3] + rand[4];
	},

	/**
	 * Generate guid - uniqueness is tested
	 * 340 000 GUIDs per second in one 2,33 GHz core
	 */
	guid: (function () {
		var timeMem, guids = {};
		const gen = "ABCDEFwxyz".split("");

		return function guid() {
			var rand = Math.random().toString();
			var time = new Date().getTime().toString();

			// Prevent duplicity
			// If time is different, reset guids cuz no collision can occurs now
			if (time != timeMem) {
				guids = {};
				timeMem = time;
			}
			// end

			var key = time[0] + gen[rand[2]]
				+ time[1] + gen[rand[3]]
				+ time[2] + gen[rand[4]]
				+ time[3] + gen[rand[5]]
				+ "-"
				+ time[4] + gen[rand[6]]
				+ time[5] + gen[rand[7]]
				+ time[6] + gen[rand[8]]
				+ "-"
				+ time[7] + gen[rand[9]]
				+ time[8] + gen[rand[10]]
				+ time[9] + gen[rand[11]]
				+ "-"
				+ time[10] + gen[rand[12]]
				+ time[11] + gen[rand[13]]
				+ time[12] + gen[rand[14]]
				+ rand[2] + rand[3] + rand[4];

			// Prevent duplicity
			if (guids[key]) return guid();
			else guids[key] = true;
			// end

			return key;
		};
	})()
};


module.exports = UtilsCrypt;