import * as core from '@actions/core';
import { INPUT_MOD_FOLDER, INPUT_MOD_NAME, PROCESS_MOD_VERSION, PROCESS_ZIP_FILE } from '@constants';
import CompressProcess from '@phases/compress';
import { zipDirectory } from '@utils/zipper';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { posix as path } from 'path';

jest.mock('@actions/core', () => {
    return {
        debug: jest.fn(),
        error: jest.fn(),
        exportVariable: jest.fn(),
        getInput: jest.fn(),
        info: jest.fn(),
        setFailed: jest.fn(),
        warning: jest.fn()
    }
});
jest.mock('fs/promises', () => ({
    rm: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(() => Promise.resolve(['file1.txt'])),
    mkdir: jest.fn(),
    stat: jest.fn(() => Promise.resolve({ isDirectory: () => false }))
}));
jest.mock('fs', () => ({
    existsSync: jest.fn(() => true)
}));
jest.mock('@utils/zipper', () => ({
    zipDirectory: jest.fn()
}));

// Mock FactorioIgnoreParser to avoid real fs/promises calls that conflict with other test suites
const mockGetPatterns = jest.fn();
jest.mock('@services/FactorioIgnoreParser', () => ({
    FactorioIgnoreParser: jest.fn().mockImplementation(() => ({
        getPatterns: mockGetPatterns,
        copyNonIgnoredFiles: jest.fn()
    }))
}));

describe('CompressProcess', () => {
    let compressProcess: CompressProcess;

    beforeEach(() => {
        compressProcess = new CompressProcess();
        process.env.RUNNER_TEMP = '/tmp';
        jest.clearAllMocks();
    });

    it('should run the compression process', async () => {
        jest.spyOn(compressProcess as any, 'getInput').mockImplementation(
            (name: any) => {
                switch (name) {
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case INPUT_MOD_FOLDER:
                        return '/folder';
                    case PROCESS_MOD_VERSION:
                        return '1.0.0';
                    default:
                        return '';
                }
            }
        );

        (zipDirectory as jest.Mock).mockResolvedValue(
            '/tmp/test-mod_1.0.0.zip'
        );
        (existsSync as jest.Mock).mockReturnValue(true);
        mockGetPatterns.mockReturnValue([]);
        compressProcess.parseInputs();
        const tmpPath = path.normalize('/tmp');

        (compressProcess as any)['tmpPath'] = tmpPath; // Set the tmpPath to the current path
        await compressProcess.run();
        expect(zipDirectory).toHaveBeenCalledWith(
            path.normalize('/tmp/zip'),
            path.normalize('/tmp/test-mod_1.0.0.zip')
        );
        expect(rm).toHaveBeenCalledWith(path.normalize('/tmp/zip'), { recursive: true });
        expect(core.info).toHaveBeenCalledWith(
            'Creating zip file: test-mod_1.0.0.zip'
        );
        expect(core.info).toHaveBeenCalledWith(
            'Zip file created: /tmp/test-mod_1.0.0.zip'
        );
        expect(core.exportVariable).toHaveBeenCalledWith(
            PROCESS_ZIP_FILE,
            '/tmp/test-mod_1.0.0.zip'
        );
    });

    it('should parse inputs correctly', () => {
        jest.spyOn(compressProcess as any, 'getInput').mockImplementation(
            (name: any) => {
                switch (name) {
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case INPUT_MOD_FOLDER:
                        return '/folder';
                    case PROCESS_MOD_VERSION:
                        return '1.0.0';
                    default:
                        return '';
                }
            }
        );

        compressProcess.parseInputs();

        expect(compressProcess['modName']).toBe('test-mod');
        expect(compressProcess['modPath']).toBe('/folder');
        expect(compressProcess['modVersion']).toBe('1.0.0');
        expect(compressProcess['tmpPath']).toBe('/tmp');
    });

    it('should throw an error if RUNNER-TEMP is not set', () => {
        delete process.env.RUNNER_TEMP;

        jest.spyOn(compressProcess as any, 'getInput').mockImplementation(
            (name: any) => {
                switch (name) {
                    case 'MOD-NAME':
                        return 'test-mod';
                    case 'MOD-VERSION':
                        return '1.0.0';
                    default:
                        return '';
                }
            }
        );

        expect(() => compressProcess.parseInputs()).toThrow(
            'RUNNER-TEMP is required'
        );
    });

    describe('auto-update-version', () => {
        it('should extract version from GITHUB_REF with v prefix', () => {
            const helper = new CompressProcess();
            const version = (helper as any).extractVersionFromRef('refs/tags/v2.0.4');
            expect(version).toBe('2.0.4');
        });

        it('should extract version from GITHUB_REF without v prefix', () => {
            const helper = new CompressProcess();
            const version = (helper as any).extractVersionFromRef('refs/tags/1.5.0');
            expect(version).toBe('1.5.0');
        });

        it('should return null for non-tag refs', () => {
            const helper = new CompressProcess();
            const version = (helper as any).extractVersionFromRef('refs/heads/main');
            expect(version).toBeNull();
        });

        it('should return null for empty ref', () => {
            const helper = new CompressProcess();
            const version = (helper as any).extractVersionFromRef('');
            expect(version).toBeNull();
        });
    });
});
