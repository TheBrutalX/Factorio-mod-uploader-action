import * as fmpe from '@errors/FactorioModPortalApiErrors';
import { IModInfo } from '@interfaces/IFactorioModInfo';
import FactorioModPortalApiService from '@services/FactorioModPortalApiService';
import axios, { AxiosError, AxiosResponse } from 'axios';

jest.mock('axios');
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
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FactorioModPortalApiService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('CheckIfModIsPublished', () => {
        it('should return true if mod exists', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { name: 'test-mod' } });
            const result = await FactorioModPortalApiService.CheckIfModIsPublished('test-mod');
            expect(result).toBe(true);
        });

        it('should return false if mod does not exist', async () => {
            const response = { data: { error: 'UnknownMod' }, status: 404, statusText: 'Not Found' } as AxiosResponse;
            const error = new AxiosError();
            error.response = response
            mockedAxios.get.mockRejectedValueOnce(error);
            const result = await FactorioModPortalApiService.CheckIfModIsPublished('test-mod');
            expect(result).toBe(false);
        });
    });

    describe('checkModVersionExists', () => {
        it('should return true if version exists in releases', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    releases: [
                        { version: '1.0.0', released_at: '2023-01-01' },
                        { version: '1.0.1', released_at: '2023-01-02' },
                        { version: '2.3.0', released_at: '2023-06-01' }
                    ]
                }
            });
            const result = await FactorioModPortalApiService.checkModVersionExists('test-mod', '1.0.0');
            expect(result).toBe(true);
        });

        it('should return false if version does not exist in releases', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    releases: [
                        { version: '2.3.0', released_at: '2023-06-01' },
                        { version: '2.3.1', released_at: '2023-06-02' }
                    ]
                }
            });
            const result = await FactorioModPortalApiService.checkModVersionExists('test-mod', '2.2.4');
            expect(result).toBe(false);
        });

        it('should return false if releases array is empty', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    releases: []
                }
            });
            const result = await FactorioModPortalApiService.checkModVersionExists('test-mod', '1.0.0');
            expect(result).toBe(false);
        });

        it('should throw ModNotFoundError if mod does not exist', async () => {
            const response = { status: 404 } as AxiosResponse;
            const error = new AxiosError();
            error.response = response;
            mockedAxios.get.mockRejectedValueOnce(error);
            await expect(FactorioModPortalApiService.checkModVersionExists('test-mod', '1.0.0'))
                .rejects.toThrow(fmpe.FactorioModPortalApiModNotFoundError);
        });
    });

    describe('ModUploadInit', () => {
        it('should return upload url', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { upload_url: 'test-url' } });
            const result = await FactorioModPortalApiService.ModUploadInit('token', 'test-mod');
            expect(result).toBe('test-url');
        });

        it('should throw InvalidApiTokenError on invalid token', async () => {
            const response = { data: { error: 'InvalidApiKey' } } as AxiosResponse;
            const error = new AxiosError();
            error.response = response;
            mockedAxios.post.mockRejectedValueOnce(error);
            await expect(FactorioModPortalApiService.ModUploadInit('invalid-token', 'test-mod'))
                .rejects.toThrow(fmpe.FactorioModPortalApiInvalidApiTokenError);
        });
    });

    describe('ModUploadFinish', () => {
        it('should complete upload successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            await expect(FactorioModPortalApiService.ModUploadFinish('token', 'upload-url', '/path/to/mod.zip'))
                .resolves.not.toThrow();
        });

        it('should throw error on upload failure', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: false, message: 'Upload failed' } });
            await expect(FactorioModPortalApiService.ModUploadFinish('token', 'upload-url', '/path/to/mod.zip'))
                .rejects.toThrow('Failed to upload mod: Upload failed');
        });
    });

    describe('ModPublishInit', () => {
        it('should return upload url', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { upload_url: 'test-url' } });
            const result = await FactorioModPortalApiService.ModPublishInit('token', 'test-mod');
            expect(result).toBe('test-url');
        });
    });

    describe('ModPublishFinish', () => {
        it('should publish mod successfully with minimal fields', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            const modInfo: IModInfo = {};
            await expect(FactorioModPortalApiService.ModPublishFinish('token', 'upload-url', modInfo, '/path/to/mod.zip'))
                .resolves.not.toThrow();
        });

        it('should publish mod successfully with all optional fields', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            const modInfo: IModInfo = {
                description: 'Test description',
                license: 'default_mit',
                sourceLink: 'https://github.com/user/repo',
                category: 'internal',
            };
            await expect(FactorioModPortalApiService.ModPublishFinish('token', 'upload-url', modInfo, '/path/to/mod.zip'))
                .resolves.not.toThrow();
        });

        it('should throw error on publish failure', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: false, message: 'Publish failed' } });
            const modInfo: IModInfo = {};
            await expect(FactorioModPortalApiService.ModPublishFinish('token', 'upload-url', modInfo, '/path/to/mod.zip'))
                .rejects.toThrow('Failed to publish mod: Publish failed');
        });
    });

    describe('ModUpdateDetails', () => {
        it('should update mod details successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
            const modInfo: IModInfo = {
                title: 'Test Mod',
                description: 'Test Description',
                tags: ['manufacturing']
            };
            await expect(FactorioModPortalApiService.ModUpdateDetails('token', 'test-mod', modInfo))
                .resolves.not.toThrow();
        });

        it('should throw error on update failure', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: false, message: 'Update failed' } });
            const modInfo: IModInfo = {};
            await expect(FactorioModPortalApiService.ModUpdateDetails('token', 'test-mod', modInfo))
                .rejects.toThrow('Failed to update mod details: Update failed');
        });
    });

    describe('HandleFactorioModPortalApiError', () => {
        const testCases = [
            { error: 'InvalidApiKey', expectedError: fmpe.FactorioModPortalApiInvalidApiTokenError },
            { error: 'InvalidRequest', expectedError: fmpe.FactorioModPortalApiInvalidRequestError },
            { error: 'InternalError', expectedError: fmpe.FactorioModPortalApiInternalError },
            { error: 'Forbidden', expectedError: fmpe.FactorioModPortalApiForbiddenError },
            { error: 'UnknownMod', expectedError: fmpe.FactorioModPortalApiModNotFoundError },
            { error: 'InvalidModRelease', expectedError: fmpe.FactorioModPortalApiInvalidModReleaseError },
            { error: 'InvalidModUpload', expectedError: fmpe.FactorioModPortalApiInvalidUploadError },
            { error: 'ModAlreadyExists', expectedError: fmpe.FactorioModPortalApiModAlreadyExistsError },
            { error: 'Unknown', expectedError: fmpe.FactorioModPortalApiUnknownError }
        ];

        testCases.forEach(({ error, expectedError }) => {
            it(`should throw ${expectedError.name} for ${error}`, () => {
                const axiosError: any = {
                    response: { data: { error } },
                    stack: 'error stack'
                };
                expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                    .toThrow(expectedError);
            });
        });

        it('should throw FactorioModPortalApiError on connection refused', () => {
            const axiosError: any = {
                code: 'ECONNREFUSED',
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiError);
        });

        it('should throw FactorioModPortalApiError on network error', () => {
            const axiosError: any = {
                code: 'ERR_NETWORK',
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiError);
        });

        it('should throw FactorioModPortalApiError on connection aborted', () => {
            const axiosError: any = {
                code: 'ECONNABORTED',
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiError);
        });

        it('should throw FactorioModPortalApiError when response is undefined', () => {
            const axiosError: any = {
                response: undefined,
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiError);
        });

        it('should throw FactorioModPortalApiInternalError on status 500', () => {
            const axiosError: any = {
                response: { status: 500, data: {} },
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiInternalError);
        });

        it('should throw FactorioModPortalApiError when error response has no data', () => {
            const axiosError: any = {
                response: { status: 400, data: undefined },
                stack: 'error stack'
            };
            expect(() => FactorioModPortalApiService.HandleFactorioModPortalApiError(axiosError))
                .toThrow(fmpe.FactorioModPortalApiError);
        });
    });
});