// Type declarations for archiver v8 (ESM class-based API)
// The installed @types/archiver v6 doesn't match archiver v8

declare module 'archiver' {
    import { Transform } from 'stream';
    import { ZlibOptions } from 'zlib';

    interface ZipOptions {
        comment?: string;
        forceLocalTime?: boolean;
        forceZip64?: boolean;
        namePrependSlash?: boolean;
        store?: boolean;
        zlib?: ZlibOptions;
    }

    export class Archiver extends Transform {
        constructor(options?: ZipOptions);
        append(source: any, data?: any): this;
        directory(dirpath: string, destpath: false | string, data?: any): this;
        file(filename: string, data: any): this;
        glob(pattern: string, options?: any, data?: any): this;
        finalize(): Promise<void>;
        pointer(): number;
        on(event: string, listener: (...args: any[]) => void): this;
    }

    export class ZipArchive extends Archiver {
        constructor(options?: ZipOptions);
    }
}
