"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function invoke(cmd, data = null) {
    process.send({
        invokeAction: cmd,
        invokeData: data
    });
}
exports.invoke = invoke;
exports.Commands = {
    Log: 0,
    BanIp: 1,
    NewSession: 2,
    WorkerReady: 3,
    ExitApp: 4,
    RestartWorker: 5
};
exports.ExitCommands = {
    Exit: 0,
    Restart: 1
};
//# sourceMappingURL=cluster-messaging.js.map