"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $cluster = require("cluster");
const $path = require("path");
const $fs = require("fs");
const ObjectUtils = require("jumbo-core/utils/object");
const path_1 = require("jumbo-core/utils/path");
if ($cluster.isMaster) {
    console.time("Application Master load-time: ");
}
else {
    console.time("Application Worker " + $cluster.worker.id + " load-time: ");
}
const DIRNAME = path_1.dirname(module);
const PROJECT_DIR = $path.dirname(require.main.filename);
const DAY_MS = 24 * 60 * 60 * 1000;
const JumboGlobalNamespace = {
    config: {},
    CONFIG_PATH: $path.join(PROJECT_DIR, "config.js"),
    CFG_PATH: $path.join(DIRNAME, "config.js"),
    BASE_DIR: PROJECT_DIR,
    CORE_DIR: DIRNAME,
    PUBLIC_DIR: $path.join(PROJECT_DIR, "public"),
    APP_DIR: $path.join(PROJECT_DIR, "app"),
    SUB_APP_DIR: $path.join(PROJECT_DIR, "app", "sub-apps"),
    ERR_DIR: $path.join(PROJECT_DIR, "data", "errors"),
    LOG_DIR: $path.join(PROJECT_DIR, "data", "logs"),
    UPLOAD_DIR: $path.resolve(PROJECT_DIR, "data", "uploads"),
    CACHE_DIR: $path.resolve(PROJECT_DIR, "temp", "cache"),
    SESSION_DIR: $path.resolve(PROJECT_DIR, "temp", "sessions"),
};
global.Jumbo = JumboGlobalNamespace;
class Loader {
    constructor() {
        this.exitStatus = false;
    }
    static initializeApplication() {
        let loader = new Loader();
        loader.initialize();
        if ($cluster.isMaster) {
            loader.deleteCachedFiles();
            loader.deleteOldSessions();
        }
        loader.initAutoloader();
        const Application = require("jumbo-core/application/Application").Application;
        let app = Application.instance;
        global.Application = app;
        global.nameof = function nameof(obj) {
            return Object.keys(obj)[0];
        };
    }
    deleteCachedFiles() {
        $fs.readdir(JumboGlobalNamespace.CACHE_DIR, (err, files) => {
            let i = 0;
            for (let fileName of files) {
                if (fileName.slice(-9) == ".tplcache") {
                    let file = $path.join(JumboGlobalNamespace.CACHE_DIR, fileName);
                    $fs.unlink(file, () => { });
                    i++;
                }
            }
            Jumbo.Logging.Log.line(`${i} cached template files deleted`);
        });
    }
    deleteOldSessions() {
        $fs.readdir(JumboGlobalNamespace.SESSION_DIR, (err, files) => {
            let sessionLimitTime = (new Date().getTime() - Jumbo.config.session.sessionLifetime * DAY_MS);
            for (let fileName of files) {
                if (fileName.slice(-8) == ".session") {
                    let file = $path.join(JumboGlobalNamespace.SESSION_DIR, fileName);
                    let stats = $fs.statSync(file);
                    if (stats.birthtime.getTime() < sessionLimitTime) {
                        $fs.unlink(file, (err) => { });
                        Jumbo.Logging.Log.line(`Deleting session file '${fileName}'`);
                    }
                }
            }
        });
    }
    initAutoloader() {
        const autoloader = require("jumbo-core/autoloader/autoloader");
        global.App = autoloader.App;
        let objs = Object.getOwnPropertyNames(autoloader.Core);
        let c = objs.length;
        for (let p = 0; p < c; p++) {
            JumboGlobalNamespace[objs[p]] = autoloader.Core[objs[p]];
        }
    }
    initialize() {
        this.checkConfig();
        this.checkAppStructure();
        if (this.exitStatus) {
            process.exit(0);
        }
    }
    checkAppStructure() {
        [
            $path.join(PROJECT_DIR, "app"),
            $path.join(PROJECT_DIR, "app", "controllers"),
            $path.join(PROJECT_DIR, "app", "sub-apps"),
            $path.join(PROJECT_DIR, "app", "services"),
            $path.join(PROJECT_DIR, "app", "models"),
            $path.join(PROJECT_DIR, "app", "templates"),
            $path.join(PROJECT_DIR, "data"),
            $path.join(PROJECT_DIR, "data", "uploads"),
            $path.join(PROJECT_DIR, "data", "logs"),
            $path.join(PROJECT_DIR, "data", "errors"),
            $path.join(PROJECT_DIR, "public"),
            $path.join(PROJECT_DIR, "temp"),
            $path.join(PROJECT_DIR, "temp", "cache"),
            $path.join(PROJECT_DIR, "temp", "sessions")
        ].forEach(function (p) {
            try {
                let stat = $fs.lstatSync(p);
                if (!stat.isDirectory()) {
                    console.error(`[ERROR] Structure directory '${p}' not found.`);
                    this.exitStatus = true;
                }
            }
            catch (ex) {
                this.exitStatus = true;
            }
        });
    }
    isInConfig(section, ...properties) {
        let sect = this.config[section];
        let succ = true;
        if (sect === undefined) {
            console.error(`[ERROR] Config file is corrupted. Section '${section}' is missing.`);
            succ = false;
        }
        else {
            for (let prop in properties) {
                prop = properties[prop];
                if (!sect.hasOwnProperty(prop)) {
                    console.error(`[ERROR] Config file is corrupted. Property '${prop}' is missing in section '${section}'.`);
                    succ = false;
                }
            }
        }
        return succ;
    }
    checkConfigSections() {
        if (this.isInConfig("protocol", "protocol", "privateKey", "certificate", "pfx", "passphrase")
            && this.isInConfig("clustering", "numberOfWorkers")
            && this.isInConfig("cache", "enabled", "memoryCacheSizeLimit")
            && this.isInConfig("session", "sessionsCookieName", "sessionLifetime", "memorySizeLimit", "justInMemory")
            && this.isInConfig("log", "enabled", "level")
            && this.isInConfig("maxRequestPerSecond")
            && this.isInConfig("maxPostDataSize")
            && this.isInConfig("deployment")
            && this.isInConfig("debugMode")
            && this.isInConfig("DOSPrevention", "enabled", "blockTime", "maxRequestPerIP")
            && this.isInConfig("globalization", "enabled")) {
            JumboGlobalNamespace.config = ObjectUtils.freeze(this.config, 2);
        }
        else {
        }
    }
    checkConfig() {
        if (!$fs.lstatSync(Jumbo.CONFIG_PATH).isFile()) {
            this.exitStatus = true;
            console.error("Application config '" + Jumbo.CONFIG_PATH + "' not found.");
        }
        try {
            let defaultConfig = require("jumbo-core/default-config.js");
            this.config = ObjectUtils.assign(defaultConfig, require(Jumbo.CONFIG_PATH));
            this.checkConfigSections();
        }
        catch (ex) {
            this.exitStatus = true;
            console.error("Config JSON invalid.", ex);
        }
    }
}
if ($cluster.isMaster) {
    console.log("*******************************");
    console.log("**");
    console.log("** JumboJS, booting up...");
    console.log("**");
    console.log("*******************************");
}
Loader.initializeApplication();
exports.application = global.Application;
//# sourceMappingURL=loader.js.map