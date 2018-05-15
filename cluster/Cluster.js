"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $cluster = require("cluster");
const DEBUG_MODE = Jumbo.config.debugMode;
const WORKERS_COUNT = !Jumbo.config.clustering.numberOfWorkers
    ? require('os').cpus().length
    : Jumbo.config.clustering.numberOfWorkers;
var ClusterCommands;
(function (ClusterCommands) {
    ClusterCommands[ClusterCommands["Log"] = 0] = "Log";
    ClusterCommands[ClusterCommands["BanIp"] = 1] = "BanIp";
    ClusterCommands[ClusterCommands["NewSession"] = 2] = "NewSession";
    ClusterCommands[ClusterCommands["WorkerReady"] = 3] = "WorkerReady";
    ClusterCommands[ClusterCommands["ExitApp"] = 4] = "ExitApp";
    ClusterCommands[ClusterCommands["RestartWorker"] = 5] = "RestartWorker";
})(ClusterCommands = exports.ClusterCommands || (exports.ClusterCommands = {}));
var ClusterExitCommands;
(function (ClusterExitCommands) {
    ClusterExitCommands[ClusterExitCommands["Exit"] = 0] = "Exit";
    ClusterExitCommands[ClusterExitCommands["Restart"] = 1] = "Restart";
})(ClusterExitCommands = exports.ClusterExitCommands || (exports.ClusterExitCommands = {}));
const istanceKey = Symbol.for("Jumbo.Cluster.Cluster");
let instance = global[istanceKey] || null;
class Cluster {
    constructor() {
        this.workers = [];
        this.numberOfWorkerReady = 0;
        this.masterHandlers = [];
        if (new.target != ClusterActivator) {
            throw new Error("You cannot call private constructor!");
        }
    }
    static get instance() {
        if (instance == null) {
            global[istanceKey] = instance = Reflect.construct(Cluster, [], ClusterActivator);
        }
        return instance;
    }
    invoke(cmd, data = null) {
        let msg = {
            invokeAction: cmd,
            invokeData: data
        };
        if ($cluster.isWorker) {
            process.send(msg);
        }
        else {
            for (let worker of this.workers) {
                worker.send(msg);
            }
        }
    }
    initClustering() {
        if ($cluster.isMaster) {
            if (Jumbo.config.clustering && typeof Jumbo.config.clustering.numberOfWorkers == "number"
                && !DEBUG_MODE) {
                for (let c = 0; c < WORKERS_COUNT; c++) {
                    this.fork();
                }
                this.on(ClusterCommands.WorkerReady, () => this.workerReady());
                this.on(ClusterCommands.ExitApp, () => this.exitApp());
                this.on(ClusterCommands.RestartWorker, event => this.restartWorker(event));
                $cluster.on("exit", (worker, code, signal) => {
                    this.onExit(worker, code, signal);
                }).on("message", (worker, message) => {
                    this.masterOnMessage(worker, message);
                });
            }
        }
        else {
            process.on("message", (message) => {
                this.workerOnMessage(message);
            });
        }
    }
    on(cmd, callback) {
        let cmdHandlers = this.masterHandlers[cmd];
        if (!cmdHandlers) {
            cmdHandlers = (this.masterHandlers[cmd] = []);
        }
        cmdHandlers.push(callback);
    }
    onExit(worker, code, signal) {
        Jumbo.Logging.Log.line(`Worker ${worker.id} exited with code: ${code == undefined ? (signal || "unknown") : code}`);
        if (code == 0)
            return;
        setTimeout(() => {
            Jumbo.Logging.Log.line(`Reforking worker ${worker.id}`);
            this.fork(worker);
        }, 1000);
    }
    fork(worker) {
        if (!!worker) {
            let oldWorkerId = this.workers.findIndex(w => w.id == worker.id);
            this.workers.splice(oldWorkerId, 1);
        }
        let fork = $cluster.fork();
        this.workers.push(fork);
        return fork;
    }
    workerOnMessage(message) {
        if (message.hasOwnProperty("exit")) {
            process.exit(message["exit"]);
        }
    }
    masterOnMessage(worker, message) {
        const Log = Jumbo.Logging.Log;
        Log.line("[Worker " + worker.id + "] sent message: " + JSON.stringify(message), Log.LogTypes.Std, Log.LogLevels.TalkativeCluster);
        let handlers = this.masterHandlers[message.invokeAction];
        if (handlers) {
            let isDefaultPrevented = false;
            let stopPropagation = false;
            let event = {
                worker: worker,
                data: message.invokeData,
                get isDefaultPrevented() {
                    return isDefaultPrevented;
                },
                preventDefault() {
                    isDefaultPrevented = true;
                },
                stopPropagation() {
                    stopPropagation = true;
                }
            };
            let i = 0;
            while (i < handlers.length && !stopPropagation) {
                handlers[i++](event);
            }
        }
        else {
            Log.warning("Not handled cluster message (code " + message.invokeAction + ").");
        }
    }
    workerReady() {
        this.numberOfWorkerReady++;
        if (this.numberOfWorkerReady == WORKERS_COUNT) {
            Jumbo.Application.Application.instance.workersReady();
        }
    }
    exitApp() {
        Jumbo.Application.Application.exit();
    }
    restartWorker(event) {
        let worker = event.worker;
        this.fork().on("online", () => {
            setTimeout(() => {
                try {
                    worker.send({ exit: 0 });
                }
                catch (e) { }
            }, 1000);
        });
    }
}
exports.Cluster = Cluster;
class ClusterActivator extends Cluster {
}
exports.cluster = Cluster.instance;
//# sourceMappingURL=Cluster.js.map