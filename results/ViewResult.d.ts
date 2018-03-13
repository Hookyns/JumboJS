export declare class ViewResult implements IViewContext {
    errors: Array<any>;
    messages: Array<IMessage>;
    lang: string;
    view: string;
    data: {};
    rawTemplate: boolean;
    partialView: boolean;
    snippet: string;
    constructor(view: string, data: {});
}
