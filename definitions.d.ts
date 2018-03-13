///<reference path="./node_modules/@types/node/index.d.ts"/>



// declare module JumboFramework {
// 	export interface Jumbo {
// 		// Jumbo: any;
// 		// Application: any;
// 		// App: any;
// 	}
// }

//
// declare module Jumbo {
// 	export interface Application {}
// }
//
// // declare global {
// //     interface Jumbo {}
// // }
//

declare interface JumboNamespace {
	config: any,
	CONFIG_PATH: string,
	CFG_PATH: string,
	BASE_DIR: string,
	CORE_DIR: string,
	PUBLIC_DIR: string,
	APP_DIR: string,
	SUB_APP_DIR: string,
	ERR_DIR: string,
	LOG_DIR: string,
	UPLOAD_DIR: string,
	CACHE_DIR: string,
	SESSION_DIR: string,

	// namespaces
	Application: any,
	Adapters: any,
	Autoloader: any,
	Base: any,
	Cluster: any,
	Exceptions: any,
	Ioc: any,
	Logging: any,
	Sync: any,
	Utils: any,
	Validation: any,
}

declare module NodeJS {
    interface Global {
	    Jumbo: JumboNamespace;
	    // Application: any;
	    // App: any;
    }
}

declare const Jumbo: JumboNamespace;
// declare var Application: any;
// declare var App: any;
//
// declare namespace Core {}