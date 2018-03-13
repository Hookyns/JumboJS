/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

/**
 * A function to calculate the approximate memory usage of objects
 * @description Created by Stephen Morley - http://code.stephenmorley.org/ - and released under the terms of the CC0 1.0 Universal legal code:
 * @link http://creativecommons.org/publicdomain/zero/1.0/legalcode
 * @param {Object} object
 * @returns {number}
 */
export function sizeof(object) {
	// initialise the list of objects and size
	let objects = [object];
	let size = 0;

	// loop over the objects
	for (let index = 0; index < objects.length; index++) {

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
			case "object":

				// if the utils_object is not an array, add the sizes of the keys
				if (Object.prototype.toString.call(objects[index]) != '[utils_object Array]') {
					for (let key in objects[index]) { // noinspection JSUnfilteredForInLoop
						size += 2 * key.length;
					}
				}

				// loop over the keys
				for (let key in objects[index]) {

					// determine whether the value has already been processed
					let processed = false;
					for (let search = 0; search < objects.length; search++) {
						// noinspection JSUnfilteredForInLoop
						if (objects[search] === objects[index][key]) {
							processed = true;
							break;
						}
					}

					// queue the value to be processed if appropriate
					if (!processed) { // noinspection JSUnfilteredForInLoop
						objects.push(objects[index][key]);
					}

				}
		}
	}

	// return the calculated size
	return size;
}

/**
 * Deep object clone
 * @param {Object} obj
 * @returns {*}
 */
export function clone(obj) {
	if (obj === undefined || obj === null) {
		throw new TypeError('Cannot convert undefined or null to object');
	}

	if (typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return (new Date).setTime(obj.getTime());
	} else if (obj instanceof Array) {
		let al = obj.length;
		let newArray = new Array(al);

		for (let a = 0; a < al; a++) {
			newArray[a] = clone(obj[a]);
		}

		return newArray;
	}

	let newObject = {};
	let props = Object.getOwnPropertyNames(obj);
	let pl = props.length;
	let propName;
	let prop;

	for (let p = 0; p < pl; p++) {
		propName = props[p];
		prop = obj[propName];

		if (prop == obj) {
			newObject[propName] = {}; // cycle reference
		} else if (typeof prop === "object") { // test can be removed; just call clone; clone test it inside
			newObject[propName] = clone(prop);
		} else {
			newObject[propName] = prop;
		}
	}

	return newObject;
}

/**
 * Create copy of object with readonly properties
 * @param {object} obj Input object.
 * @param {number} [depth] Depth. How many levels of object should be readonly.
 */
export function getReadonlyVariant(obj: object, depth?: number) {
	if (obj.constructor != Object) throw new Error("Given object must be true object.");
	depth = depth || 1;

	let rtrn = {};
	let val;

	Object.getOwnPropertyNames(obj).forEach(function (propName) {
		val = obj[propName];

		if (val instanceof Array) {
			let al = val.length;
			let newArray = [];

			for (let a = 0; a < al; a++) {
				newArray.push(val[a]);
			}

			val = newArray;
		} else if (val instanceof Date) {
			val = new Date().setTime(val.getTime());
		} else if (val && val.constructor == Object) {
			val = getReadonlyVariant(val, depth - 1);
		}

		Object.defineProperty(rtrn, propName, {
			value: val,
			enumerable: true
		});
	});

	return rtrn;
}

/**
 * Create copy of object with readonly properties
 * @param {object} obj Input object.
 * @param {number} [depth] Depth. How many levels of object should be readonly.
 */
export function freeze(obj: object, depth: number = 1): Readonly<object> {
	if (obj.constructor !== Object) throw new Error("Given object must be true object.");

	Object.freeze(obj);
	depth--;

	if (depth > 0) {
		let val;

		Object.keys(obj).forEach(function (propName) {
			val = obj[propName];

			if (val && val.constructor === Object) {
				freeze(obj, depth);
			}
		});
	}

	return obj;
}

/**
 * Create copy of object with readonly properties
 * @param {object} target Input object.
 * @param {object} source
 * @param {number} [depth] Depth. How many levels of object should be readonly.
 */
export function assign(target: object, source: object, depth: number = 1): any {
	if (depth <= 0) return {};
	if (target.constructor !== Object) throw new Error("Given object must be true object.");

	depth--;
	const keys = Object.keys(source);

	for (let key of keys) {
		if (source[key] && source[key].constructor === Object) {
			Object.assign(source[key], assign(target[key], source[key], depth))
		}
	}

	Object.assign(target || {}, source);

	return target;
}