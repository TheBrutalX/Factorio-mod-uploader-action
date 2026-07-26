import { getInput, setFailed } from '@actions/core';
import { IBaseProcess } from './interfaces/IBaseProcess';

import CompressProcess from '@phases/compress';
import UploadProcess from '@phases/upload';
import ValidateProcess from '@phases/validate';

export async function run(): Promise<boolean> {
    try {
        const action = getInput('action');
        let instance: IBaseProcess;
        switch (action) {
            case 'validate':
                instance = new ValidateProcess();
                break;
            case 'compress':
                instance = new CompressProcess();
                break;
            case 'upload':
                instance = new UploadProcess();
                break;
            default:
                throw new Error('Invalid action. Please use validate');
        }
        instance.parseInputs();
        await instance.run();
        return true;
    } catch (error) {
        if (error instanceof Error) setFailed(error.message);
        return false;
    }
}

if (process.env.NODE_ENV !== 'development') {
    run();
}
