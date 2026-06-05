import { debug } from '@actions/core';
import * as fmpe from '@errors/FactorioModPortalApiErrors';
import { IModInfo } from '@interfaces/IFactorioModInfo';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { FactorioErrorResponse, FinishUploadResponse, InitPublishResponse, InitUploadResponse, ModInfo } from './interfaces';
const modApiUrl = 'https://mods.factorio.com/api';

export default class FactorioModPortalApiService {
    //#region Internal API

    public static async CheckIfModIsPublished(name: string): Promise<boolean> {
        try {
            const url = `${modApiUrl}/mods/${name}`;
            const result = await axios.get<ModInfo>(url);
            if (result.data.name === name) return true;
            return false;
        } catch (error) {
            if (error instanceof AxiosError) {
                if (error.response?.status === 404 || error.code == '404') return false;
                throw new fmpe.FactorioModPortalApiError('Unknown error', error.stack);
            }
            throw new Error(`Error fetching mod info: ${error}`);
        }
    }

    public static async getLatestModVersion(name: string): Promise<string | undefined> {
        try {
            const url = `${modApiUrl}/mods/${name}`;
            const response = await axios.get<ModInfo>(url);
            const modInfo = response.data;
            if (!modInfo.releases) throw new fmpe.FactorioModPortalApiModNotFoundError();
            const latestRelease = modInfo.releases.reduce(
                (latest, release) => {
                    return new Date(release.released_at) >
                        new Date(latest.released_at)
                        ? release
                        : latest;
                },
                modInfo.releases[0]
            );
            return latestRelease.version;
        } catch (error) {
            // If error is 404, the mod does not exist, check if error is axiosError
            if (error instanceof AxiosError) {
                if (error.response?.status === 404) throw new fmpe.FactorioModPortalApiModNotFoundError();
            } else {
                throw new Error(`Error fetching mod info: ${error}`);
            }
        }
    }

    //#endregion

    //#region Public API

    //#region Mod Upload

    public static async ModUploadInit(
        token: string,
        modName: string
    ): Promise<string> {
        const url = `${modApiUrl}/v2/mods/releases/init_upload`;
        const formData = new FormData();
        formData.append('mod', modName);
        try {
            const response = await axios.post<InitUploadResponse>(
                url,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...formData.getHeaders(),
                    },
                }
            );
            return response.data.upload_url!;
        } catch (e) {
            if (e instanceof AxiosError) {
                FactorioModPortalApiService.HandleFactorioModPortalApiError(e);
            }
            throw e;
        }
    }

    public static async ModUploadFinish(
        token: string,
        upload_url: string,
        modZipPath: string
    ): Promise<void> {
        const uploadFormData = new FormData();
        const fileData = createReadStream(modZipPath);
        const fileName = basename(modZipPath);
        uploadFormData.append('file', fileData, fileName);

        try {
            const response = await axios.post<FinishUploadResponse>(
                upload_url,
                uploadFormData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...uploadFormData.getHeaders(),
                    },
                }
            );
            if (response.data.success !== true) {
                throw new Error(
                    `Failed to upload mod: ${response.data.message}`
                );
            }
        } catch (e) {
            if (e instanceof AxiosError) {
                FactorioModPortalApiService.HandleFactorioModPortalApiError(e);
            }
            throw e;
        }
    }

    //#endregion Mod Upload

    //#region Mod Publish

    public static async ModPublishInit(
        token: string,
        modName: string): Promise<string> {
        const url = `${modApiUrl}/v2/mods/init_publish`;
        const formData = new FormData();
        formData.append('mod', modName);
        try {
            const response = await axios.post<InitPublishResponse>(
                url,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...formData.getHeaders(),
                    },
                }
            );
            return response.data.upload_url!;
        } catch (e) {
            if (e instanceof AxiosError) {
                FactorioModPortalApiService.HandleFactorioModPortalApiError(e);
            }
            throw e;
        }
    }

    public static async ModPublishFinish(
        token: string,
        upload_url: string,
        modInfo: IModInfo,
        modZipPath: string
    ): Promise<void> {
        const uploadFormData = new FormData();
        const fileData = createReadStream(modZipPath);
        const fileName = basename(modZipPath);
        uploadFormData.append('file', fileData, fileName);
        if (modInfo.description) uploadFormData.append('description', modInfo.description);
        if (modInfo.license) uploadFormData.append('license', modInfo.license);
        if (modInfo.sourceLink) uploadFormData.append('source_url', modInfo.sourceLink);
        if (modInfo.category) uploadFormData.append('category', modInfo.category);

        try {
            const response = await axios.post<FinishUploadResponse>(
                upload_url,
                uploadFormData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...uploadFormData.getHeaders(),
                    },
                }
            );
            if (response.data.success !== true) {
                throw new Error(
                    `Failed to publish mod: ${response.data.message}`
                );
            }
        } catch (e) {
            if (e instanceof AxiosError) {
                FactorioModPortalApiService.HandleFactorioModPortalApiError(e);
            }
            throw e;
        }
    }

    //#endregion Mod Publish

    //#region Edit Mod Details

    public static async ModUpdateDetails(token: string, modName: string, modInfo: IModInfo): Promise<void> {
        const url = `${modApiUrl}/v2/mods/edit_details`;
        const formData = new FormData();
        formData.append('mod', modName);
        if (modInfo.title) formData.append('title', modInfo.title);
        if (modInfo.summary) formData.append('summary', modInfo.summary);
        if (modInfo.description) formData.append('description', modInfo.description);
        if (modInfo.category) formData.append('category', modInfo.category);
        if (modInfo.tags) {
            for (const tag of modInfo.tags) {
                formData.append('tags', tag);
            }
        }
        if (modInfo.license) formData.append('license', modInfo.license);
        //NOTE - Homepage field is not implemented in the mod_info.yml
        //NOTE - Deprecated field is not implemented in the mod_info.yml
        if (modInfo.sourceLink) formData.append('source_url', modInfo.sourceLink);
        //NOTE - Faq field is not implemented in the mod_info.yml

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...formData.getHeaders(),
                },
            });
            if (response.data.success !== true) {
                throw new Error(
                    `Failed to update mod details: ${response.data.message}`
                );
            }
        } catch (e) {
            if (e instanceof AxiosError) {
                FactorioModPortalApiService.HandleFactorioModPortalApiError(e);
            }
            throw e;
        }
    }

    //#endregion Edit Mod Details

    //#endregion    

    static HandleFactorioModPortalApiError(e: AxiosError): void {
        debug(JSON.stringify(e.response?.data));
        if (e.response === undefined) throw new fmpe.FactorioModPortalApiError('Unknown error', e.stack);
        if (e.code === 'ECONNREFUSED') throw new fmpe.FactorioModPortalApiError('Connection refused', e.stack);
        if (e.response.status === 500) throw new fmpe.FactorioModPortalApiInternalError(e.stack);
        if (!e.response.data) throw new fmpe.FactorioModPortalApiError('Unknown error', e.stack);
        const errorResponse = e.response.data as FactorioErrorResponse;
        if (!errorResponse.error) throw new fmpe.FactorioModPortalApiError('Missing error on body', e.stack);
        switch (errorResponse.error) {
            case 'InvalidApiKey':
                throw new fmpe.FactorioModPortalApiInvalidApiTokenError(e.stack);
            case 'InvalidRequest':
                throw new fmpe.FactorioModPortalApiInvalidRequestError(e.stack);
            case 'InternalError':
                throw new fmpe.FactorioModPortalApiInternalError(e.stack);
            case 'Forbidden':
                throw new fmpe.FactorioModPortalApiForbiddenError(e.stack);
            case 'UnknownMod':
                throw new fmpe.FactorioModPortalApiModNotFoundError(e.stack);
            case 'InvalidModRelease':
                throw new fmpe.FactorioModPortalApiInvalidModReleaseError(e.stack);
            case 'InvalidModUpload':
                throw new fmpe.FactorioModPortalApiInvalidUploadError(e.stack);
            case 'ModAlreadyExists':
                throw new fmpe.FactorioModPortalApiModAlreadyExistsError(e.stack);
            case 'Unknown':
            default:
                throw new fmpe.FactorioModPortalApiUnknownError(e.stack);
        }
    }
}