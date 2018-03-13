export namespace Configurations {
    export enum Protocols {
        Http = 0,
        Https = 1,
    }

    export enum Cache {
        InMemory = 0,
        HardDrive = 1,
    }

    export enum LogLevels {
        Error = 1,
        Warning = 2,
        Normal = 3,
        Talkative = 4,
        TalkativeCluster = 5,
    }

    export enum Deployment {
        Development = 0,
        Production = 1,
    }
}