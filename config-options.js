"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Configurations;
(function (Configurations) {
    let Protocols;
    (function (Protocols) {
        Protocols[Protocols["Http"] = 0] = "Http";
        Protocols[Protocols["Https"] = 1] = "Https";
    })(Protocols = Configurations.Protocols || (Configurations.Protocols = {}));
    let Cache;
    (function (Cache) {
        Cache[Cache["InMemory"] = 0] = "InMemory";
        Cache[Cache["HardDrive"] = 1] = "HardDrive";
    })(Cache = Configurations.Cache || (Configurations.Cache = {}));
    let LogLevels;
    (function (LogLevels) {
        LogLevels[LogLevels["Error"] = 1] = "Error";
        LogLevels[LogLevels["Warning"] = 2] = "Warning";
        LogLevels[LogLevels["Normal"] = 3] = "Normal";
        LogLevels[LogLevels["Talkative"] = 4] = "Talkative";
        LogLevels[LogLevels["TalkativeCluster"] = 5] = "TalkativeCluster";
    })(LogLevels = Configurations.LogLevels || (Configurations.LogLevels = {}));
    let Deployment;
    (function (Deployment) {
        Deployment[Deployment["Development"] = 0] = "Development";
        Deployment[Deployment["Production"] = 1] = "Production";
    })(Deployment = Configurations.Deployment || (Configurations.Deployment = {}));
})(Configurations = exports.Configurations || (exports.Configurations = {}));
//# sourceMappingURL=config-options.js.map