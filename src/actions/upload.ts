import { IModInfo } from '@/interfaces/IFactorioModInfo';
import { INPUT_FACTORIO_API_KEY, INPUT_MOD_FOLDER, INPUT_MOD_NAME, PROCESS_CREATE_ON_PORTAL, PROCESS_ZIP_FILE } from '@constants';
import { FactorioModInfoParser } from '@services/FactorioModInfoParser';
import FactorioModPortalApiService from '@services/FactorioModPortalApiService';
import { existsSync } from 'fs';
import BaseProcess from './baseProcess';

export default class UploadProcess extends BaseProcess {
    private modName: string = '';
    private modPath: string = '';
    private modZipPath: string = '';
    private modApiToken: string = '';
    private createOnPortal: boolean = false;

    private modInfo!: IModInfo;

    public parseInputs(): void {
        // From User
        this.modApiToken = this.getInput(INPUT_FACTORIO_API_KEY);
        // From Process
        this.modInfo = {} as IModInfo;
        this.modName = this.getInput(INPUT_MOD_NAME);
        this.modPath = this.getInput(INPUT_MOD_FOLDER);
        this.modZipPath = this.getInput(PROCESS_ZIP_FILE);
        this.createOnPortal = this.getInputBoolen(PROCESS_CREATE_ON_PORTAL, false);

        if (existsSync(this.modZipPath) === false) {
            throw new Error(`File not found: '${this.modZipPath}', please check the path or check if the compress action is running before this action`);
        }
    }

    public async run(): Promise<void> {
        this.modInfo = await this.parseModInfo();
        const modExists = await FactorioModPortalApiService.CheckIfModIsPublished(this.modName);
        if (modExists && this.createOnPortal) {
            throw new Error(`Mod ${this.modName} already exists on the portal, please check the name`);
        }
        if (this.createOnPortal) {
            this.debug("Mod is set to be created on the portal");
            await this.createModFlow();
        } else {
            this.debug("Mod is set to be uploaded to the portal");
            await this.uploadModFlow();
        }
        await this.updateDetails();
    }

    private async parseModInfo(): Promise<IModInfo> {
        const modInfoPath = `${this.modPath}/mod_info.yml`;
        const modInfoInstance = await FactorioModInfoParser.fromFile(modInfoPath);
        const isValid = await modInfoInstance.validate();
        if (!isValid) {
            throw new Error(`Mod info is not valid, please check the file`);
        }
        return modInfoInstance.getFullInfo();
    }

    private async createModFlow(): Promise<void> {
        const initPublishUrl = await FactorioModPortalApiService.ModPublishInit(this.modApiToken, this.modName);
        await FactorioModPortalApiService.ModPublishFinish(this.modApiToken, initPublishUrl, this.modInfo, this.modZipPath);
        this.info(`Mod ${this.modName} created successfully on mod Portal`);
    }

    private async uploadModFlow(): Promise<void> {
        const uploadUrl = await FactorioModPortalApiService.ModUploadInit(this.modApiToken, this.modName);
        await FactorioModPortalApiService.ModUploadFinish(this.modApiToken, uploadUrl, this.modZipPath);
        this.info(`Mod ${this.modName} uploaded successfully on mod Portal`);
    }

    private async updateDetails(): Promise<void> {
        await FactorioModPortalApiService.ModUpdateDetails(this.modApiToken, this.modName, this.modInfo);
    }
}
