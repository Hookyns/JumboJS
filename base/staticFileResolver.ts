import * as $fs from "fs";
import * as $path from "path";
import * as fileExtensionToMimeMap from "jumbo-core/utils/file-extension-to-mime-map";

/**
 * Default function resolving static files
 * @param fileName
 * @param callback
 */
export function staticFileResolver(fileName, callback) {
	$fs.lstat(fileName, (error, stats) => {
		if (error)
		{
			callback(error, null, null, null);
			return;
		}

		if (stats.isFile())
		{
			let mime = fileExtensionToMimeMap[$path.extname(fileName).slice(1)];
			callback(null, $fs.createReadStream(fileName), mime, stats.size);
		}
		else if (stats.isDirectory())
		{
			callback(new Error("Accessing folder content is not allowed."), null, null, null);
		}
		else
		{
			callback(new Error("File not found."), null, null, null);
		}
	});
}