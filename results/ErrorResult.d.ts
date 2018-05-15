import { Exception } from "../exceptions/Exception";
export declare class ErrorResult {
    message: string;
    statusCode: number;
    error: Error | Exception;
    constructor(message: string, statusCode?: number, error?: Error | Exception);
}
