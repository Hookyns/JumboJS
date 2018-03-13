export declare enum LogTypes {
    Http = "http",
    Std = "std",
    Start = "start",
}
export declare enum LogLevels {
    Error = 1,
    Warning = 2,
    Normal = 3,
    Talkative = 4,
    TalkativeCluster = 5,
}
export declare class Log {
    private static isInitiated;
    private static dir;
    private static which;
    static level: any;
    static readonly LogLevels: typeof LogLevels;
    static readonly LogTypes: typeof LogTypes;
    static logFunction: (message, type) => void;
    static error(message: any, type?: any, level?: LogLevels): void;
    static warning(message: any, type?: any, level?: LogLevels): void;
    static line(message: any, type?: LogTypes, level?: LogLevels): void;
    static curTime(): string;
    static init(): void;
}
