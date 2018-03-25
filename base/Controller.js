"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Controller");
}
let $fs, $path, fileExtensionToMimeMap;
let crossRequestDataStorage = {};
const XJUMBO_REQUEST_ACTION_MAP = {
    "text/html": function (ctrl, viewOrData, data = null) {
        return ctrl.partialView(viewOrData, data);
    },
    "text/template": function (ctrl, view) {
        return ctrl.template(typeof view == "string" ? view : null);
    },
    "application/json": function (ctrl, viewOrData, data = null) {
        return ctrl.json(data || viewOrData || {});
    },
};
const X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME = "x-required-content-type";
class Controller {
    constructor() {
        this.session = {};
        this.scope = null;
        this.exited = false;
        this.crossRequestData = null;
    }
    get url() {
        return new Jumbo.Utils.Url(this.request);
    }
    _initController(request, response, session, scope) {
        this.session = session;
        this.request = request;
        this.response = response;
        this.scope = scope;
        this.crossRequestData = new Proxy({}, {
            get: function (obj, key) {
                if (!crossRequestDataStorage.hasOwnProperty(request.sessionId)) {
                    return undefined;
                }
                return crossRequestDataStorage[request.sessionId][key];
            },
            set: function (obj, key, value) {
                if (!crossRequestDataStorage.hasOwnProperty(request.sessionId)) {
                    crossRequestDataStorage[request.sessionId] = {};
                }
                return crossRequestDataStorage[request.sessionId][key] = value;
            },
            getOwnPropertyDescriptor: function (obj, key) {
                if (!crossRequestDataStorage.hasOwnProperty(request.sessionId)) {
                    return undefined;
                }
                return Object.getOwnPropertyDescriptor(crossRequestDataStorage[request.sessionId], key);
            }
        });
    }
    _clearOldCrossRequestData() {
        if (!crossRequestDataStorage.hasOwnProperty(this.request.sessionId)) {
            return;
        }
        delete crossRequestDataStorage[this.request.sessionId];
    }
    static createBaseViewResult(viewOrData, data) {
        if (typeof viewOrData == "string") {
            return new ViewResult_1.ViewResult(viewOrData, data || {});
        }
        return new ViewResult_1.ViewResult(null, viewOrData || {});
    }
    exit() {
        this.exited = true;
        if (!this.response.response.finished) {
            this.response.response.end();
        }
    }
    addMessage(message, messageType) {
        if (!crossRequestDataStorage.hasOwnProperty(this.request.sessionId)
            || !crossRequestDataStorage[this.request.sessionId].hasOwnProperty(Controller.clientMessagesId)) {
            this.crossRequestData[Controller.clientMessagesId] = [];
        }
        crossRequestDataStorage[this.request.sessionId][Controller.clientMessagesId]
            .push({ message: message, type: messageType });
    }
    renderView(viewOrData, data = null) {
        return Controller.createBaseViewResult(viewOrData, data);
    }
    partialView(partialViewOrData = null, data = null) {
        let res = Controller.createBaseViewResult(partialViewOrData, data);
        res.partialView = true;
        return res;
    }
    template(view = null) {
        let res = Controller.createBaseViewResult(view, undefined);
        res.rawTemplate = true;
        return res;
    }
    view(viewOrData, data = null) {
        let reqTypeHeader = this.request.request.headers[X_JUMBO_VIEW_TYPE_HEADER_PROP_NAME];
        if (reqTypeHeader) {
            let action = XJUMBO_REQUEST_ACTION_MAP[reqTypeHeader];
            if (action) {
                return action(this, viewOrData, data);
            }
        }
        return this.renderView(viewOrData, data);
    }
    snippetView(viewOrData, dataOrSnippetName = null, snippetName = "content") {
        let res;
        if (typeof viewOrData == "string") {
            res = new ViewResult_1.ViewResult(viewOrData, dataOrSnippetName.constructor == Object ? dataOrSnippetName : {});
        }
        else {
            res = new ViewResult_1.ViewResult(null, viewOrData.constructor == Object ? viewOrData : {});
        }
        res.snippet = snippetName;
        res.partialView = true;
        return res;
    }
    data(data, type = "text/plain") {
        if (type && type.trim().length != 0) {
            this.response.headers["Content-Type"] = type;
        }
        this.response.headers["Content-Length"] = Buffer.byteLength(data, "utf-8");
        this.response.response.writeHead(200, this.response.headers);
        this.response.response.end(data);
        this.exit();
    }
    json(jsonObj) {
        this.data(JSON.stringify(jsonObj), "application/json");
        this.exit();
    }
    error(message, statusCode = 500, error = undefined) {
        return {
            status: statusCode,
            message: message,
            error: error
        };
    }
    fileDownload(filePath, newName, contentType) {
        if (!$fs) {
            $fs = require("fs");
        }
        if (!$path) {
            $path = require("path");
        }
        if (!contentType && !fileExtensionToMimeMap) {
            fileExtensionToMimeMap = require("jumbo-core/utils/file-extension-to-mime-map");
        }
        $fs.lstat(filePath, (error, stats) => {
            if (error || !stats || !stats.isFile()) {
                return this.error(`File '${filePath}' given for download is not valid file.`, 404);
            }
            if (!newName) {
                newName = $path.parse(filePath).base;
            }
            let mime = contentType || fileExtensionToMimeMap[$path.extname(filePath).slice(1)];
            this.response.headers["Content-Disposition"] = "attachment; filename=" + newName;
            this.response.headers["Content-Type"] = mime;
            this.response.headers["Content-Type"] = stats.size;
            this.response.response.writeHead(200, this.response.headers);
            $fs.createReadStream(filePath).pipe(this.response.response);
            this.exit();
        });
    }
    redirect(url) {
        this.response.redirectUrl(url.getUrl());
        this.exit();
    }
}
Controller.clientMessagesId = "_clientMessages";
exports.Controller = Controller;
const ViewResult_1 = require("jumbo-core/results/ViewResult");
if (Jumbo.config.jumboDebugMode) {
    console.log("[DEBUG] REQUIRE: Controller END");
}
//# sourceMappingURL=Controller.js.map