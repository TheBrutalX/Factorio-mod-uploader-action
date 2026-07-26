import ActionHelper from '@utils/ActionHelper';
import FactorioModPortalApiService from '@services/FactorioModPortalApiService';
import { FactorioModPortalApiModNotFoundError } from '@errors/FactorioModPortalApiErrors';

jest.mock('@services/FactorioModPortalApiService');

jest.mock('@actions/core', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    exportVariable: jest.fn(),
    getInput: jest.fn(),
    info: jest.fn(),
    setFailed: jest.fn(),
    warning: jest.fn(),
}));

describe('ActionHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isValidVersion', () => {
        it('should return true for valid semver', () => {
            expect(ActionHelper.isValidVersion('1.0.0')).toBe(true);
        });

        it('should return true for valid semver with pre-release', () => {
            expect(ActionHelper.isValidVersion('1.0.0-beta.1')).toBe(true);
        });

        it('should return false for invalid version', () => {
            expect(ActionHelper.isValidVersion('invalid')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(ActionHelper.isValidVersion('')).toBe(false);
        });
    });

    describe('checkModOnPortal', () => {
        it('should return true when mod exists', async () => {
            jest.spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockResolvedValue(true);

            const result = await ActionHelper.checkModOnPortal('test-mod');
            expect(result).toBe(true);
        });

        it('should return false when mod does not exist', async () => {
            jest.spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockResolvedValue(false);

            const result = await ActionHelper.checkModOnPortal('test-mod');
            expect(result).toBe(false);
        });

        it('should re-throw errors from API', async () => {
            const error = new Error('API error');
            jest.spyOn(FactorioModPortalApiService, 'CheckIfModIsPublished')
                .mockRejectedValue(error);

            await expect(ActionHelper.checkModOnPortal('test-mod')).rejects.toThrow('API error');
        });
    });

    describe('checkModVersion', () => {
        it('should return false when version already exists on portal', async () => {
            jest.spyOn(FactorioModPortalApiService, 'checkModVersionExists')
                .mockResolvedValue(true);

            const result = await ActionHelper.checkModVersion('test-mod', '1.0.0');
            expect(result).toBe(false);
        });

        it('should return true when version does not exist on portal', async () => {
            jest.spyOn(FactorioModPortalApiService, 'checkModVersionExists')
                .mockResolvedValue(false);

            const result = await ActionHelper.checkModVersion('test-mod', '1.0.0');
            expect(result).toBe(true);
        });

        it('should return false when mod is not found on portal', async () => {
            jest.spyOn(FactorioModPortalApiService, 'checkModVersionExists')
                .mockRejectedValue(new FactorioModPortalApiModNotFoundError());

            const result = await ActionHelper.checkModVersion('test-mod', '1.0.0');
            expect(result).toBe(false);
        });

        it('should re-throw non-ModNotFound errors', async () => {
            jest.spyOn(FactorioModPortalApiService, 'checkModVersionExists')
                .mockRejectedValue(new Error('Unexpected error'));

            await expect(ActionHelper.checkModVersion('test-mod', '1.0.0')).rejects.toThrow('Unexpected error');
        });
    });
});
