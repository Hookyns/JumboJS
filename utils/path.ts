import * as $os from "os";
import * as $path from "path";

const IS_WIN32: boolean = $os.platform() === "win32";

/**
 * Return dirname for given module with drive letter case on Windows
 * @param {NodeModule} targetModule
 * @returns {string}
 */
export function dirname(targetModule: NodeModule) {
	let path = $path.dirname(targetModule.filename);

	// Update drive letter case on Windows
	if (IS_WIN32) {
		path = path.charAt(0).toUpperCase() + path.slice(1);
	}

	return path;
}