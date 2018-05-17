export declare const MAIN_SUBAPP_NAME = "_default";
export declare class ControllerFactory {
    private subApp;
    static readonly instance: ControllerFactory;
    constructor();
    getSubAppId(subApp: string): SubAppIdString;
    getControllerId(controller: string): ControllerIdString;
    getActionId(action: string, method?: string): ActionIdString;
    getSubAppName(subApp: string): FullSubAppNameString;
    getControllerName(controller: string, subAppId?: SubAppIdString): FullControllerNameString;
    getActionName(action: string, controllerId: ControllerIdString, subAppId?: SubAppIdString, method?: string): FullActionNameString;
    getSubAppInfo(subAppId: SubAppIdString): ISubAppInfo;
    getControllerInfo(controllerId: ControllerIdString, subAppId: SubAppIdString): IControllerInfo;
    getActionInfo(actionId: ActionIdString, controllerId: ControllerIdString, subAppId: SubAppIdString): IActionInfo;
    createController(controllerId: ControllerIdString, subAppId: SubAppIdString, scope: Scope): any;
    getTargetPoint(subApp: string, controller: string, action: string, method?: string): IApplicationTargetPoint;
    getFunctionParameters(func: Function): any[];
    getConstructorParameters(func: any): Array<string>;
    private findAction(actions, action);
    private getParameters(func, regex);
    private loadActionsFromController(ctrl);
    private loadControllersFromNamespace(namespace, subAppId, appendTo?);
    private camelToKebabCase(subApp);
    private loadControllersAndActions();
    private clearRequireCache();
}
import { Scope } from "jumbo-core/ioc/Scope";
