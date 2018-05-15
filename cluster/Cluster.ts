/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

//region Imports

import * as $cluster from "cluster";

//endregion

//region Declarations

const DEBUG_MODE = Jumbo.config.debugMode; // Does application run in debug mode?
const WORKERS_COUNT = !Jumbo.config.clustering.numberOfWorkers
	? require('os').cpus().length
	: Jumbo.config.clustering.numberOfWorkers;

export enum ClusterCommands
{
	Log = 0,
	BanIp = 1,
	NewSession = 2,
	WorkerReady = 3,
	ExitApp = 4,
	RestartWorker = 5,
}

export enum ClusterExitCommands
{
	Exit = 0,
	Restart = 1,
}

declare interface IClusterMessage
{
	invokeAction: ClusterCommands,
	invokeData: any
}

export interface IClusterActionEvent
{
	worker: $cluster.Worker;
	data: any;
	isDefaultPrevented: boolean

	/**
	 * Stop calling next handlers
	 */
	stopPropagation(): void;

	/**
	 * Tell to others registered handler after this one that you prevent their behaviou
	 */
	preventDefault(): void;
}

//endregion

// Cluster singleton instance
const istanceKey = Symbol.for("Jumbo.Cluster.Cluster");
let instance: Cluster = global[istanceKey] || null;

/**
 * Class for clustering
 * @description Contains methods for comunication between workers and master, logic for process spawning etc..
 */
export class Cluster
{
	//region Fields

	/**
	 * List of runing Workers
	 * @type {$cluster.Worker[]}
	 */
	private workers: Array<$cluster.Worker> = [];

	/**
	 * If clustering enabled, hold number of workers ready
	 */
	private numberOfWorkerReady: number = 0;

	/**
	 * Lst of master action handlers
	 * @type {{clusterCommand: Function[]}
	 */
	private masterHandlers: { [clusterCommand: number]: Array<(event: IClusterActionEvent) => void> } = [];

	//endregion

	//region Properties

	/**
	 * Get instance of Application
	 * @return {Application}
	 */
	static get instance(): Cluster
	{
		if (instance == null)
		{
			global[istanceKey] = instance = Reflect.construct(Cluster, [], ClusterActivator);
		}

		return instance;
	}

	//endregion

	//region Ctor

	constructor()
	{
		if (new.target != ClusterActivator)
		{
			throw new Error("You cannot call private constructor!");
		}
	}

	//endregion

	//region Methods

	// noinspection JSMethodCanBeStatic
	/**
	 * Send message frm worker to master or from master to every worker
	 * @param {ClusterCommands} cmd
	 * @param {{}} data
	 */
	public invoke(cmd: ClusterCommands, data = null)
	{
		let msg = {
			invokeAction: cmd,
			invokeData: data
		};

		if ($cluster.isWorker)
		{
			process.send(msg);
		}
		else
		{
			for (let worker of this.workers)
			{
				worker.send(msg);
			}
		}
	}

	/**
	 * Initiate application clustering
	 */
	public initClustering()
	{
		if ($cluster.isMaster)
		{
			// Fork this process - start clustering
			if (Jumbo.config.clustering && typeof Jumbo.config.clustering.numberOfWorkers == "number"
				&& !DEBUG_MODE)
			{
				for (let c = 0; c < WORKERS_COUNT; c++)
				{
					this.fork();
				}

				// Register build-in handlers

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
		else
		{
			process.on("message", (message) => {
				this.workerOnMessage(message);
			});
		}
	}

	/**
	 * Register callback
	 * @param {ClusterCommands} cmd
	 * @param {(event: IClusterActionEvent) => void} callback
	 */
	public on(cmd: ClusterCommands, callback: (event: IClusterActionEvent) => void): void
	{
		let cmdHandlers = this.masterHandlers[cmd];

		if (!cmdHandlers)
		{
			cmdHandlers = (this.masterHandlers[cmd] = []);
		}

		cmdHandlers.push(callback);
	}

	//endregion

	//region Private methods

	/**
	 * Handler for cluster exit (if worker exit)
	 * @param worker
	 * @param code
	 * @param signal
	 */
	private onExit(worker: $cluster.Worker, code, signal)
	{
		Jumbo.Logging.Log.line(`Worker ${worker.id} exited with code: ${code == undefined ? (signal || "unknown") : code}`);

		// wanted exit
		if (code == 0) return;

		// Refork process after 1 sec
		setTimeout(() => {
			Jumbo.Logging.Log.line(`Reforking worker ${worker.id}`);
			this.fork(worker);
		}, 1000);
	}

	/**
	 * Fork (or refork) process; create new Worker
	 * @param {"cluster".Worker} worker
	 */
	private fork(worker?: $cluster.Worker): $cluster.Worker
	{
		// Remove old worker from list if exists
		if (!!worker)
		{
			let oldWorkerId = this.workers.findIndex(w => w.id == worker.id);
			this.workers.splice(oldWorkerId, 1);
		}

		// Fork new worker
		let fork = $cluster.fork();
		this.workers.push(fork);

		return fork;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Handler for worker messages
	 * @param {IClusterMessage} message
	 */
	private workerOnMessage(message: IClusterMessage): void
	{
		if (message.hasOwnProperty("exit"))
		{
			process.exit(message["exit"]);
		}
	}

	/**
	 * Handler for master messages
	 * @param {$cluster.Worker} worker
	 * @param message
	 */
	private masterOnMessage(worker: $cluster.Worker, message: IClusterMessage): void
	{
		const Log = Jumbo.Logging.Log;

		Log.line("[Worker " + worker.id + "] sent message: " + JSON.stringify(message),
			Log.LogTypes.Std, Log.LogLevels.TalkativeCluster);

		let handlers = this.masterHandlers[message.invokeAction];

		if (handlers)
		{
			let isDefaultPrevented = false;
			let stopPropagation = false;
			let event: IClusterActionEvent = {
				worker: worker,
				data: message.invokeData,
				get isDefaultPrevented() {
					return isDefaultPrevented;
				},
				preventDefault()
				{
					isDefaultPrevented = true;
				},
				stopPropagation()
				{
					stopPropagation = true;
				}
			};

			let i = 0;

			while (i < handlers.length && !stopPropagation)
			{
				handlers[i++](event);
			}
		}
		else
		{
			Log.warning("Not handled cluster message (code " + message.invokeAction + ").");
		}
	}

	//region Build-in handler

	private workerReady()
	{
		this.numberOfWorkerReady++;
		if (this.numberOfWorkerReady == WORKERS_COUNT)
		{
			Jumbo.Application.Application.instance.workersReady();
		}
	}

	// noinspection JSMethodCanBeStatic
	private exitApp()
	{
		Jumbo.Application.Application.exit();
	}

	private restartWorker(event: IClusterActionEvent)
	{
		let worker: $cluster.Worker = event.worker;

		// Create new worker
		this.fork().on("online", () => {
			setTimeout(() => {
				try
				{
					// exit old worker
					worker.send({exit: 0});
				}
				catch (e)
				{}
			}, 1000);
		});
	}

	//endregion

	//endregion
}

class ClusterActivator extends Cluster
{
}

export const cluster = Cluster.instance;