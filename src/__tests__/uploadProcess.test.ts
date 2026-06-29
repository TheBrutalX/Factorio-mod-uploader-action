import * as core from '@actions/core';
import { INPUT_FACTORIO_API_KEY, INPUT_MOD_FOLDER, INPUT_MOD_NAME, INPUT_SKIP_UPDATE_DETAILS, PROCESS_CREATE_ON_PORTAL, PROCESS_ZIP_FILE } from '@constants';
import UploadProcess from '@phases/upload';
import FactorioModPortalApiService from '@services/FactorioModPortalApiService';
import { existsSync } from 'node:fs';

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
jest.mock('@services/FactorioModPortalApiService');
jest.mock('node:fs', () => ({
    existsSync: jest.fn()
}));

describe('UploadProcess', () => {
    let uploadProcess: UploadProcess;

    beforeEach(() => {
        uploadProcess = new UploadProcess();
        jest.clearAllMocks();
    });

    describe('parseInputs', () => {
        it('should parse inputs correctly', () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(true);

            uploadProcess.parseInputs();

            expect(uploadProcess['modName']).toBe('test-mod');
            expect(uploadProcess['modZipPath']).toBe(
                './dist/test-mod_1.0.0.zip'
            );
            expect(uploadProcess['modApiToken']).toBe('test-api-key');
        });

        it('should throw an error if ZIP_FILE does not exist', () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(false);

            expect(() => uploadProcess.parseInputs()).toThrow(
                `File not found: './dist/test-mod_1.0.0.zip', please check the path or check if the compress action is running before this action`
            );
        });

        it('should throw an error if any input is missing', () => {
            jest.spyOn(core, 'getInput').mockImplementation(() => {
                return '';
            });

            expect(() => uploadProcess.parseInputs()).toThrow();
        });

        it('should parse skip-update-details input correctly', () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    case INPUT_SKIP_UPDATE_DETAILS:
                        return 'true';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(true);

            uploadProcess.parseInputs();

            expect(uploadProcess['skipUpdateDetails']).toBe(true);
            expect(uploadProcess['hasModInfo']).toBe(true);
        });

        it('should detect mod_info.yml existence correctly', () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    case INPUT_SKIP_UPDATE_DETAILS:
                        return 'false';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(true);

            uploadProcess.parseInputs();

            expect(uploadProcess['hasModInfo']).toBe(true);
        });
    });

    describe('run', () => {
        const mockModInfo = {
            title: 'Test Mod',
            description: 'Test Description',
            tags: ['manufacturing']
        };

        it('should skip updateDetails when skipUpdateDetails is true', async () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    case INPUT_SKIP_UPDATE_DETAILS:
                        return 'true';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(true);
            uploadProcess.parseInputs();

            // Mock parseModInfo to return a valid mod info
            jest.spyOn(uploadProcess as any, 'parseModInfo').mockResolvedValue(mockModInfo);

            const mockCheckIfModIsPublished = jest
                .spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockResolvedValue(false);
            const mockUploadModFlow = jest
                .spyOn(uploadProcess as any, 'uploadModFlow')
                .mockResolvedValue(undefined);
            const mockUpdateDetails = jest
                .spyOn(uploadProcess as any, 'updateDetails')
                .mockResolvedValue(undefined);

            await uploadProcess.run();

            expect(mockCheckIfModIsPublished).toHaveBeenCalled();
            expect(mockUploadModFlow).toHaveBeenCalled();
            expect(mockUpdateDetails).not.toHaveBeenCalled();
        });

        it('should skip updateDetails when mod_info.yml does not exist', async () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    case INPUT_SKIP_UPDATE_DETAILS:
                        return 'false';
                    default:
                        return '';
                }
            });

            // Mock existsSync: true for zip file, false for mod_info.yml
            (existsSync as jest.Mock).mockReturnValue(true);
            (existsSync as jest.Mock).mockReturnValueOnce(false);
            uploadProcess.parseInputs();

            // Mock parseModInfo to return a valid mod info
            jest.spyOn(uploadProcess as any, 'parseModInfo').mockResolvedValue(mockModInfo);

            const mockCheckIfModIsPublished = jest
                .spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockResolvedValue(false);
            const mockUploadModFlow = jest
                .spyOn(uploadProcess as any, 'uploadModFlow')
                .mockResolvedValue(undefined);
            const mockUpdateDetails = jest
                .spyOn(uploadProcess as any, 'updateDetails')
                .mockResolvedValue(undefined);

            await uploadProcess.run();

            expect(mockCheckIfModIsPublished).toHaveBeenCalled();
            expect(mockUploadModFlow).toHaveBeenCalled();
            expect(mockUpdateDetails).not.toHaveBeenCalled();
        });

        it('should call updateDetails when both conditions are met', async () => {
            jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
                switch (name) {
                    case INPUT_MOD_FOLDER:
                        return 'test-mod';
                    case INPUT_MOD_NAME:
                        return 'test-mod';
                    case PROCESS_ZIP_FILE:
                        return './dist/test-mod_1.0.0.zip';
                    case INPUT_FACTORIO_API_KEY:
                        return 'test-api-key';
                    case PROCESS_CREATE_ON_PORTAL:
                        return 'false';
                    case INPUT_SKIP_UPDATE_DETAILS:
                        return 'false';
                    default:
                        return '';
                }
            });

            (existsSync as jest.Mock).mockReturnValue(true); // mod_info.yml exists
            uploadProcess.parseInputs();

            // Mock parseModInfo to return a valid mod info
            jest.spyOn(uploadProcess as any, 'parseModInfo').mockResolvedValue(mockModInfo);

            const mockCheckIfModIsPublished = jest
                .spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockResolvedValue(false);
            const mockUploadModFlow = jest
                .spyOn(uploadProcess as any, 'uploadModFlow')
                .mockResolvedValue(undefined);
            const mockUpdateDetails = jest
                .spyOn(uploadProcess as any, 'updateDetails')
                .mockResolvedValue(undefined);

            await uploadProcess.run();

            expect(mockCheckIfModIsPublished).toHaveBeenCalled();
            expect(mockUploadModFlow).toHaveBeenCalled();
            expect(mockUpdateDetails).toHaveBeenCalled();
        });
    });
});
