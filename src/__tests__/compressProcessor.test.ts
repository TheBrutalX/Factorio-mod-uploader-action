import * as core from '@actions/core';
import { INPUT_DOTIGNORE_FILE, INPUT_MOD_FOLDER, INPUT_MOD_NAME, PROCESS_MOD_VERSION, PROCESS_ZIP_FILE } from '@constants';
import CompressProcess from '@phases/compress';
import { zipDirectory } from '@utils/zipper';
import { rm } from 'node:fs/promises';
import { posix as path } from 'node:path';

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
jest.mock('node:fs/promises', () => ({
    rm: jest.fn(),
    readFile: jest.fn(() => Promise.resolve('')),
    readdir: jest.fn(() => Promise.resolve(['file1.txt'])),
    mkdir: jest.fn(),
    stat: jest.fn(() => Promise.resolve({ isDirectory: () => false }))
}));
jest.mock('node:fs', () => ({
    existsSync: jest.fn(() => true)
}));

// Access the mock function for control in tests
const mockExistsSync = require('node:fs').existsSync as jest.Mock;
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

const mockUpdateVersion = jest.fn();
const mockSaveToFile = jest.fn();
const mockValidate = jest.fn();
const mockGetFullInfo = jest.fn();
const mockParserInstance = {
    updateVersion: mockUpdateVersion,
    saveToFile: mockSaveToFile,
    validate: mockValidate,
    getFullInfo: mockGetFullInfo,
};
jest.mock('@services/FactorioModInfoParser', () => ({
    FactorioModInfoParser: Object.assign(
        jest.fn(() => mockParserInstance),
        { fromFile: jest.fn(() => Promise.resolve(mockParserInstance)) }
    ),
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
            path.join(process.env.RUNNER_TEMP || '/tmp', 'test-mod_1.0.0.zip')
        );
        mockExistsSync.mockReturnValue(true);
        mockGetPatterns.mockReturnValue([]);
        compressProcess.parseInputs();
        const tmpPath = path.normalize('/tmp');

        (compressProcess as any)['tmpPath'] = tmpPath; // Set the tmpPath to the current path
        await compressProcess.run();
        expect(zipDirectory).toHaveBeenCalledWith(
            // sonar-disable-next-line S5443 - Test file using mock paths, not real filesystem
            path.normalize('/tmp/zip'),
            // sonar-disable-next-line S5443 - Test file using mock paths, not real filesystem
            path.normalize('/tmp/test-mod_1.0.0.zip')
        );
        // sonar-disable-next-line S5443 - Test file using mock paths, not real filesystem
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

    it('should skip deleting modDir when it does not exist', async () => {
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

        // dotignore exists, modDir does not exist
        mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockGetPatterns.mockReturnValue([]);
        (zipDirectory as jest.Mock).mockResolvedValue('/tmp/test-mod_1.0.0.zip');
        compressProcess.parseInputs();
        const tmpPath = path.normalize('/tmp');
        (compressProcess as any)['tmpPath'] = tmpPath;

        await compressProcess.run();

        // rm should be called only for cleaning up zipDir after zipping, not for modDir
        expect(rm).toHaveBeenCalledWith(path.normalize('/tmp/zip'), { recursive: true });
        expect(core.warning).not.toHaveBeenCalledWith(
            expect.stringContaining('already exists')
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

    describe('run with autoUpdateVersion', () => {
        beforeEach(() => {
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
            mockExistsSync.mockReturnValue(true);
            mockGetPatterns.mockReturnValue([]);
            (zipDirectory as jest.Mock).mockResolvedValue('/tmp/test-mod_1.0.0.zip');
            mockUpdateVersion.mockClear();
            mockSaveToFile.mockClear();
        });

        it('should update version from GITHUB_REF with v prefix', async () => {
            process.env.GITHUB_REF = 'refs/tags/v2.0.4';
            jest.spyOn(compressProcess as any, 'getInputBoolean').mockReturnValue(true);
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(mockUpdateVersion).toHaveBeenCalledWith('2.0.4');
            expect(mockSaveToFile).toHaveBeenCalled();
            expect(core.info).toHaveBeenCalledWith(
                'Auto-updating version to 2.0.4 (from GITHUB_REF: refs/tags/v2.0.4)'
            );
        });

        it('should update version from GITHUB_REF without v prefix', async () => {
            process.env.GITHUB_REF = 'refs/tags/2.0.4';
            jest.spyOn(compressProcess as any, 'getInputBoolean').mockReturnValue(true);
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(mockUpdateVersion).toHaveBeenCalledWith('2.0.4');
            expect(core.info).toHaveBeenCalledWith(
                'Auto-updating version to 2.0.4 (from GITHUB_REF: refs/tags/2.0.4)'
            );
        });

        it('should warn when GITHUB_REF is not a tag ref', async () => {
            process.env.GITHUB_REF = 'refs/heads/main';
            jest.spyOn(compressProcess as any, 'getInputBoolean').mockReturnValue(true);
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(mockUpdateVersion).not.toHaveBeenCalled();
            expect(core.warning).toHaveBeenCalledWith(
                expect.stringContaining('Could not extract version from GITHUB_REF')
            );
        });

        it('should not auto-update when autoUpdateVersion is false', async () => {
            process.env.GITHUB_REF = 'refs/tags/v2.0.4';
            jest.spyOn(compressProcess as any, 'getInputBoolean').mockReturnValue(false);
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(mockUpdateVersion).not.toHaveBeenCalled();
        });
    });

    describe('dotignore edge cases', () => {
        it('should warn when dotignore file does not exist', async () => {
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

            // dotignorePath does not exist, modDir exists
            mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
            mockGetPatterns.mockReturnValue([]);
            (zipDirectory as jest.Mock).mockResolvedValue('/tmp/test-mod_1.0.0.zip');
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(core.warning).toHaveBeenCalledWith(
                expect.stringContaining('No .factorioignore found')
            );
            expect(core.warning).toHaveBeenCalledWith(
                expect.stringContaining('Please create a')
            );
        });

        it('should use provided dotignore file name', async () => {
            jest.spyOn(compressProcess as any, 'getInput').mockImplementation(
                (name: any) => {
                    switch (name) {
                        case INPUT_MOD_NAME:
                            return 'test-mod';
                        case INPUT_MOD_FOLDER:
                            return '/folder';
                        case PROCESS_MOD_VERSION:
                            return '1.0.0';
                        case INPUT_DOTIGNORE_FILE:
                            return '.my-custom-ignore';
                        default:
                            return '';
                    }
                }
            );

            mockExistsSync.mockReturnValue(true);
            mockGetPatterns.mockReturnValue([]);
            (zipDirectory as jest.Mock).mockResolvedValue('/tmp/test-mod_1.0.0.zip');
            compressProcess.parseInputs();
            const tmpPath = path.normalize('/tmp');
            (compressProcess as any)['tmpPath'] = tmpPath;

            await compressProcess.run();

            expect(compressProcess['dotignorefile']).toBe('.my-custom-ignore');
            expect(core.debug).not.toHaveBeenCalledWith(
                expect.stringContaining('No INPUT_DOTIGNORE_FILE specified')
            );
        });
    });
});
