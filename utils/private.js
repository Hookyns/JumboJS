/**
 * Private is mixin module which add private properties to classes
 *
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor
 */

/**
 * Mixin adding support for private properties
 * @memberOf Jumbo.Utils
 * @example
 *      class Parent {
 *          constructor() {
 *              // do something
 *          }
 *
 *          foo() {
 *              // do something
 *          }
 *      }
 *
 *      var refObject = {}, _;
 *      class Child extends Private(refObject, Parent) {
 *          constructor() {
 *              _(this).yourFirstPrivateProperty = "First private property";
 *
 *              _(this).privateMethod = function() {
 *                  // Do something
 *              };
 *          }
 *      }
 *      _ = refObject.accessor; // Just to shortcut notation
 * @param {Object} refObject This param must be reference object. This mixin edit that object - create property "accesor" which is function which provide you access to private properties.
 * @param {Function} [extend]
 */
function Private(refObject, extend) {
	var storage = [];
	var idCounter = 0;

	var cls = class extends (extend || class {}) {
		constructor() {
			super();

			// Get new ID
			this.__privateId = idCounter++;

			var clsInstance = this;

			// Define proxy as dynamic prperty accessor
			storage[this.__privateId] = new Proxy({}, {
				get: function(target, name) {
					if (!(name in target)) {
						return undefined;
					}
					return target[name];
				},
				set: function(target, name, value) {
					if (typeof value == "function") {
						target[name] = function(...args) {
							return value.apply(clsInstance, args)
						};
					} else {
						target[name] = value;
					}

					return true;
				}
			});
		}
	};

	// Return proxy with access to private context
	refObject.accessor = function(self) {
		return storage[self.__privateId];
	};

	return cls;
}

module.exports = Private;