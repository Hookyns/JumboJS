import * as $cluster from "cluster";
export declare enum ClusterCommands {
    Log = 0,
    BanIp = 1,
    NewSession = 2,
    WorkerReady = 3,
    ExitApp = 4,
    RestartWorker = 5,
}
export declare enum ClusterExitCommands {
    Exit = 0,
    Restart = 1,
}
export interface IClusterActionEvent {
    worker: $cluster.Worker;
    data: any;
    isDefaultPrevented: boolean;
    stopPropagation(): void;
    preventDefault(): void;
}
export declare class Cluster {
    private workers;
    private numberOfWorkerReady;
    private masterHandlers;
    static readonly instance: Cluster;
    constructor();
    invoke(cmd: ClusterCommands, data?: any): void;
    initClustering(): void;
    on(cmd: ClusterCommands, callback: (event: IClusterActionEvent) => void): void;
    private onExit(worker, code, signal);
    private fork(worker?);
    private workerOnMessage(message);
    private masterOnMessage(worker, message);
    private workerReady();
    private exitApp();
    private restartWorker(event);
}
export declare const cluster: Cluster;
