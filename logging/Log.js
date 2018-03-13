"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $fs = require("fs");
const $path = require("path");
const $cluster = require("cluster");
const $clusterCmds = require("../cluster/cluster-messaging");
const $newLine = require("os").EOL;
const $cfg = require("jumbo-core/config").Configurations;
const config = Jumbo.config;
var LogTypes;
(function (LogTypes) {
    LogTypes["Http"] = "http";
    LogTypes["Std"] = "std";
    LogTypes["Start"] = "start";
})(LogTypes = exports.LogTypes || (exports.LogTypes = {}));
var LogLevels;
(function (LogLevels) {
    LogLevels[LogLevels["Error"] = 1] = "Error";
    LogLevels[LogLevels["Warning"] = 2] = "Warning";
    LogLevels[LogLevels["Normal"] = 3] = "Normal";
    LogLevels[LogLevels["Talkative"] = 4] = "Talkative";
    LogLevels[LogLevels["TalkativeCluster"] = 5] = "TalkativeCluster";
})(LogLevels = exports.LogLevels || (exports.LogLevels = {}));
class Log {
    static get LogLevels() {
        return LogLevels;
    }
    static get LogTypes() {
        return LogTypes;
    }
    static error(message, type = undefined, level = LogLevels.Error) {
        Log.line("ERROR: " + message, type, level);
    }
    static warning(message, type = undefined, level = LogLevels.Warning) {
        Log.line("WARNING: " + message, type, level);
    }
    static line(message, type = LogTypes.Std, level = LogLevels.Normal) {
        if (!Jumbo.config.log.enabled) {
            return;
        }
        if (level <= Log.level) {
            if ($cluster.isMaster) {
                Log.logFunction(message, type);
            }
            else {
                message = "[Worker " + $cluster.worker.id + "] " + message;
                $clusterCmds.invoke($clusterCmds.Commands.Log, {
                    message: message,
                    type: type,
                    level: level
                });
            }
        }
    }
    static curTime() {
        let d = new Date();
        function edit(a) {
            return a.toString().length === 1 ? ("0" + a) : a;
        }
        return d.getFullYear() + "-" + edit(d.getMonth()) + "-" + edit(d.getDate())
            + " " + edit(d.getHours()) + ":" + edit(d.getMinutes()) + ":" + edit(d.getSeconds());
    }
    static init() {
        if (config.log.enabled === true) {
            if ($fs.lstatSync(Log.dir).isDirectory()) {
                this.which = this.curTime().replace(/[: ]/g, "-");
                this.isInitiated = true;
            }
        }
    }
}
Log.isInitiated = false;
Log.dir = Jumbo.LOG_DIR;
Log.which = null;
Log.level = config.log.level;
Log.logFunction = function (message, type) {
    message = Log.curTime() + " [" + type.toUpperCase() + "] " + message;
    if (Jumbo.config.deployment == $cfg.Deployment.Development) {
        console.log(message);
    }
    if (Log.isInitiated) {
        $fs.appendFile($path.resolve(Log.dir, type + "-" + Log.which + ".log"), message + $newLine, function (err) {
            if (err != null) {
                console.error("Error ocurs while writing into log.\n" + err);
            }
        });
    }
};
exports.Log = Log;
Log.init();
//# sourceMappingURL=Log.js.map