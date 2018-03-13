import { Exception } from "./Exception";
export declare class RequestException extends Exception {
    statusCode: number;
    redirectTo: string;
    constructor(message: string, statusCode?: number, buildStack?: boolean, redirectTo?: string);
}
