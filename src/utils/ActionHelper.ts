import { FactorioModPortalApiModNotFoundError } from "@/errors/FactorioModPortalApiErrors";
import FactorioModPortalApiService from "@/services/FactorioModPortalApiService";
import { debug } from "@actions/core";
import semver from 'semver';

export default class ActionHelper {

    public static isValidVersion(version: string) {
        return semver.valid(version) !== null;
    } 

    // Check if the mod is already on the portal
    public static async checkModOnPortal(name: string) : Promise<boolean> {
        try {
            const modExists = await FactorioModPortalApiService.CheckIfModIsPublished(name);
            if(modExists) {
                debug(`Mod ${name} is already on the portal`);
            } else {
                debug(`Mod ${name} is not on the portal`);
            }
            return modExists;
        } catch (error) {
            debug(`Failed to check if mod ${name} is on the portal: ${error}`);
            throw error;
        }
    }

    // Check if the mod version is already on the portal
    public static async checkModVersion(
        name: string,
        version: string
    ): Promise<boolean> {
        try {
            const latestVersion = await FactorioModPortalApiService.getLatestModVersion(name);
            if (!latestVersion) return false
            return semver.gt(version, latestVersion);
        } catch (error) {
            if (error instanceof FactorioModPortalApiModNotFoundError) return false;
            throw error;
        }
    }

}