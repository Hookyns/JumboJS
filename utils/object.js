"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function sizeof(object) {
    let objects = [object];
    let size = 0;
    for (let index = 0; index < objects.length; index++) {
        switch (typeof objects[index]) {
            case 'boolean':
                size += 4;
                break;
            case 'number':
                size += 8;
                break;
            case 'string':
                size += 2 * objects[index].length;
                break;
            case "object":
                if (Object.prototype.toString.call(objects[index]) != '[utils_object Array]') {
                    for (let key in objects[index]) {
                        size += 2 * key.length;
                    }
                }
                for (let key in objects[index]) {
                    let processed = false;
                    for (let search = 0; search < objects.length; search++) {
                        if (objects[search] === objects[index][key]) {
                            processed = true;
                            break;
                        }
                    }
                    if (!processed) {
                        objects.push(objects[index][key]);
                    }
                }
        }
    }
    return size;
}
exports.sizeof = sizeof;
function clone(obj) {
    if (obj === undefined || obj === null) {
        throw new TypeError('Cannot convert undefined or null to object');
    }
    if (typeof obj !== "object") {
        return obj;
    }
    if (obj instanceof Date) {
        return (new Date).setTime(obj.getTime());
    }
    else if (obj instanceof Array) {
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
            newObject[propName] = {};
        }
        else if (typeof prop === "object") {
            newObject[propName] = clone(prop);
        }
        else {
            newObject[propName] = prop;
        }
    }
    return newObject;
}
exports.clone = clone;
function getReadonlyVariant(obj, depth) {
    if (obj.constructor != Object)
        throw new Error("Given object must be true object.");
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
        }
        else if (val instanceof Date) {
            val = new Date().setTime(val.getTime());
        }
        else if (val && val.constructor == Object) {
            val = getReadonlyVariant(val, depth - 1);
        }
        Object.defineProperty(rtrn, propName, {
            value: val,
            enumerable: true
        });
    });
    return rtrn;
}
exports.getReadonlyVariant = getReadonlyVariant;
function freeze(obj, depth = 1) {
    if (obj.constructor !== Object)
        throw new Error("Given object must be true object.");
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
exports.freeze = freeze;
function assign(target, source, depth = 1) {
    if (depth <= 0)
        return {};
    if (target.constructor !== Object)
        throw new Error("Given object must be true object.");
    depth--;
    const keys = Object.keys(source);
    for (let key of keys) {
        if (source[key] && source[key].constructor === Object) {
            Object.assign(source[key], assign(target[key], source[key], depth));
        }
    }
    Object.assign(target || {}, source);
    return target;
}
exports.assign = assign;
//# sourceMappingURL=object.js.map