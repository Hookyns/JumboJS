/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */

/**
 * @memberOf Jumbo.Utils
 */
var UtilsObject = {
	/**
	 * A function to calculate the approximate memory usage of objects
	 * @description Created by Stephen Morley - http://code.stephenmorley.org/ - and released under the terms of the CC0 1.0 Universal legal code:
	 * @link http://creativecommons.org/publicdomain/zero/1.0/legalcode
	 * @param {Object} object
	 * @returns {number}
	 */
	sizeof: function (object) {
		// initialise the list of objects and size
		var objects = [object];
		var size = 0;

		// loop over the objects
		for (var index = 0; index < objects.length; index++) {

			// determine the type of the utils_object
			switch (typeof objects[index]) {

				// the utils_object is a boolean
				case 'boolean':
					size += 4;
					break;

				// the utils_object is a number
				case 'number':
					size += 8;
					break;

				// the utils_object is a string
				case 'string':
					size += 2 * objects[index].length;
					break;

				// the utils_object is a generic utils_object
				case 'utils_object':

					// if the utils_object is not an array, add the sizes of the keys
					if (Object.prototype.toString.call(objects[index]) != '[utils_object Array]') {
						for (var key in objects[index]) size += 2 * key.length;
					}

					// loop over the keys
					for (var key in objects[index]) {

						// determine whether the value has already been processed
						var processed = false;
						for (var search = 0; search < objects.length; search++) {
							if (objects[search] === objects[index][key]) {
								processed = true;
								break;
							}
						}

						// queue the value to be processed if appropriate
						if (!processed) objects.push(objects[index][key]);

					}
			}
		}

		// return the calculated size
		return size;
	},


	/**
	 * Deep object clone
	 * @param {Object} obj
	 * @returns {*}
	 */
	clone: function (obj) {
		if (obj === undefined || obj === null) {
			throw new TypeError('Cannot convert undefined or null to object');
		}

		if (obj instanceof Date) {
			return (new Date).setTime(obj.getTime());
		} else if (obj instanceof Array) {
			var al = obj.length;
			var newArray = [];

			for (var a = 0; a < al; a++) {
				newArray.push(obj[a]);
			}

			return newArray;
		}


		var newObject = {};
		var props = Object.getOwnPropertyNames(obj);
		var pl = props.length;
		var propName;
		var prop;

		for (var p = 0; p < pl; p++) {
			propName = props[p];
			prop = obj[propName];

			if (prop == obj) {
				newObject[propName] = {};
			} else if (prop instanceof Object) {
				newObject[propName] = UtilsObject.clone(prop);
			} else {
				newObject[propName] = prop;
			}
		}

		return newObject;
	},


	/**
	 * Create copy of object with readonly properties
	 * @param {Object} obj
	 */
	getReadonlyVariant: function(obj) {
		if (obj.constructor != Object) throw new Error("Given object must be truly object.");

		var rtrn = {};
		var val;

		Object.getOwnPropertyNames(obj).forEach(function (propName) {
			val = obj[propName];

			if (val instanceof Array) {
				var al = val.length;
				var newArray = [];

				for (var a = 0; a < al; a++) {
					newArray.push(val[a]);
				}

				val = newArray;
			} else if (val instanceof Date) {
				val = new Date().setTime(val.getTime());
			} else if (val instanceof Object) {
				val = UtilsObject.getReadonlyVariant(val);
			}

			Object.defineProperty(rtrn, propName, {
				value: val,
				enumerable: true
			});
		});

		return rtrn;
	}
};

module.exports = UtilsObject;