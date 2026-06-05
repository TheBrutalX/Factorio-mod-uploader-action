import * as core from '@actions/core';
import { INPUT_MOD_FOLDER, INPUT_MOD_NAME, PROCESS_MOD_VERSION } from '@constants';
import ValidateProcess from '@phases/validate';
import FactorioModPortalApiService from '@services/FactorioModPortalApiService';
import ActionHelper from '@utils/ActionHelper';
import fs from 'node:fs';

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
jest.mock('@utils/ActionHelper');

describe('ValidateProcess', () => {
    let validateProcess: ValidateProcess;

    beforeEach(() => {
        validateProcess = new ValidateProcess();
        jest.clearAllMocks();
    });

    it('should throw error if info.json not found', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        await expect(validateProcess.run()).rejects.toThrow(
            'info.json not found'
        );
    });

    it('should throw error if mod name is missing', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue('{}');
        await expect(validateProcess.run()).rejects.toThrow(
            'Missing mod name in info.json'
        );
    });

    it('should throw error if mod version is missing', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "test-mod"}'
        );
        await expect(validateProcess.run()).rejects.toThrow(
            'Missing mod version in info.json'
        );
    });

    it('should throw error if mod name is too short', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "ab", "version": "1.0.0"}'
        );
        await expect(validateProcess.run()).rejects.toThrow(
            'Mod name is too short'
        );
    });

    it('should throw error if mod name is too long', async () => {
        const longName = 'a'.repeat(101);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            `{"name": "${longName}", "version": "1.0.0"}`
        );
        await expect(validateProcess.run()).rejects.toThrow(
            'Mod name is too long'
        );
    });

    it('should throw error if mod name contains invalid characters', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "invalid name!", "version": "1.0.0"}'
        );
        await expect(validateProcess.run()).rejects.toThrow(
            'Invalid mod name in info.json'
        );
    });

    it('should throw error if mod version is invalid', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "test-mod", "version": "invalid"}'
        );
        await expect(validateProcess.run()).rejects.toThrow(
            'Invalid version in info.json'
        );
    });

    it('should throw error if mod already exists with the same version', async () => {
        jest.spyOn(ActionHelper, 'isValidVersion').mockReturnValue(true);
        jest.spyOn(ActionHelper, 'checkModOnPortal').mockResolvedValue(true);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "test-mod", "version": "1.0.0"}'
        );
        (
            FactorioModPortalApiService.getLatestModVersion as jest.Mock
        ).mockResolvedValue('1.0.0');
        await expect(validateProcess.run()).rejects.toThrow(
            "Mod 'test-mod' version '1.0.0' is already on the portal"
        );
    });

    it('should pass validation with valid info.json', async () => {
        jest.spyOn(ActionHelper, 'isValidVersion').mockReturnValue(true);
        jest.spyOn(ActionHelper, 'checkModOnPortal').mockResolvedValue(true);
        jest.spyOn(ActionHelper, 'checkModVersion').mockResolvedValue(true);
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs.promises, 'readFile').mockResolvedValue(
            '{"name": "test-mod", "version": "1.0.1"}'
        );
        (
            FactorioModPortalApiService.getLatestModVersion as jest.Mock
        ).mockResolvedValue('1.0.0');
        await validateProcess.run();
        expect(core.info).toHaveBeenCalledWith('Mod name: test-mod');
        expect(core.info).toHaveBeenCalledWith('Mod version: 1.0.1');
        expect(core.debug).toHaveBeenCalledWith('info.json is valid');
        expect(core.exportVariable).toHaveBeenCalledWith(
            INPUT_MOD_NAME,
            'test-mod'
        );
        expect(core.exportVariable).toHaveBeenCalledWith(
            PROCESS_MOD_VERSION,
            '1.0.1'
        );
        expect(core.exportVariable).toHaveBeenCalledWith(
            INPUT_MOD_FOLDER,
            expect.any(String)
        );
    });
});
