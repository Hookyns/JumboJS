import * as ApplicationModule from "./application/Application";
import * as ControllerFactoryModule from "./application/ControllerFactory";
import * as LocatorModule from "./application/Locator";
import * as RequestModule from "application/Request";
import * as ResponseModule from "application/Response";
import * as ControllerModule from "./base/Controller";
import * as ClusterModule from "./cluster/Cluster";
import * as ExceptionModule from "./exceptions/Exception";
import * as RequestExceptionModule from "./exceptions/RequestException";
import * as DIContainerModule from "./ioc/DIContainer";
import * as ScopeModule from "./ioc/Scope";
import * as LogModule from "./logging/Log";
import * as ViewResultModule from "./results/ViewResult";
import * as UrlModule from "./utils/Url";
import * as ValidatableModule from "validation/Validatable";

declare global
{
	export function nameof(obj: any): string;
	export function inject(serviceName: string): (target: Object, property: string | Symbol) => void;

	module Jumbo
	{
		export const config: any;
		export const CONFIG_PATH: string;
		export const CFG_PATH: string;
		export const BASE_DIR: string;
		export const CORE_DIR: string;
		export const PUBLIC_DIR: string;
		export const APP_DIR: string;
		export const SUB_APP_DIR: string;
		export const ERR_DIR: string;
		export const LOG_DIR: string;
		export const UPLOAD_DIR: string;
		export const CACHE_DIR: string;
		export const SESSION_DIR: string;

		module Adapters
		{
			export const TemplateAdapter: ITemplateAdapter;
		}

		module Application
		{
			export const Application: typeof ApplicationModule.Application;
			export const ControllerFactory: typeof ControllerFactoryModule.ControllerFactory;
			export const Locator: typeof LocatorModule.Locator;
			export const Request: typeof RequestModule.Request;
			export const Response: typeof ResponseModule.Response;
		}

		module Autoloader
		{
			interface Autoloader
			{
				Core: any;
				App: any;
				loadDir: Function;
			}
		}

		module Base
		{
			export const Controller: typeof ControllerModule.Controller;
		}

		module Cluster
		{
			export const Cluster: ClusterModule.Cluster;
		}

		module Exceptions
		{
			export const Exception: ExceptionModule.Exception;
			export const RequestException: RequestExceptionModule.RequestException;
		}

		module Ioc
		{
			export const DIContainer: typeof DIContainerModule.DIContainer;
			export const Scope: typeof ScopeModule.Scope;
		}

		module Logging
		{
			export const Log: typeof LogModule.Log;
		}

		module Results
		{
			export const ViewResult: typeof ViewResultModule.ViewResult;
		}

		module Utils
		{
			export const Url: typeof UrlModule.Url;
		}

		module Validation
		{
			export const Validatable: typeof ValidatableModule.Validatable;
		}
	}
}