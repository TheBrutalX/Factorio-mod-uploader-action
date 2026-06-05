import { IModInfo } from "@/interfaces/IFactorioModInfo";
import { ValidateFactorioCategory, ValidateFactorioLicense, ValidateFactorioTags } from "@/types/FactorioTypes";
import { error, info, warning } from "@actions/core";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { dump, load } from 'js-yaml';
import path from "path/posix";

type ModInfoWrapper = {
    mod_info?: {
        description_file?: string;
        summary?: string;
        title?: string;
        attach_source_link?: boolean;
        license?: string;
        category?: string;
        tags?: string[];
    };
}

/*
* FactorioModInfoParser class
* Parses the mod_info.yml file and validates the content
*/
export class FactorioModInfoParser {
    private readonly yamlContent: ModInfoWrapper;
    private readonly modInfo: IModInfo;
    private readonly modDir: string;

    constructor(content: string, modDir?: string) {
        try {
            this.yamlContent = this.parseYaml(content) as ModInfoWrapper;
            this.modInfo = {
                category: undefined,
                tags: [],
                license: undefined,
                description: undefined,
                sourceLink: undefined,
            } as IModInfo;
            if (!modDir) {
                modDir = process.env.GITHUB_WORKSPACE || '';
            }
            this.modDir = modDir;

        } catch (error) {
            throw new Error(`YAML parsing error: ${error}`);
        }
    }

    private parseYaml(content: string): ModInfoWrapper {
        try {
            const parsedContent = load(content) as ModInfoWrapper;
            return parsedContent || {};
        } catch (error) {
            throw new Error(`YAML parsing error: ${error}`);
        }
    }

    public getFullInfo(): IModInfo {
        return this.modInfo;
    }

    public async validate(): Promise<boolean> {

        const modInfo = this.yamlContent.mod_info;
        // If there's no mod_info section at all, that's valid (empty config)
        if (!modInfo) return true;
        // Type validation for optional fields
        const isValid = (
            (modInfo.description_file === undefined || typeof modInfo.description_file === 'string') ||
            (error('Invalid type for description_file'), false)
        ) && (
                (modInfo.summary === undefined || (typeof modInfo.summary === 'string' && modInfo.summary.length >= 1 && modInfo.summary.length <= 250)) ||
                (error('Invalid type for summary, min lenght is 1 char and max is 250'), false)
            ) && (
                (modInfo.title === undefined || (typeof modInfo.title === 'string' && modInfo.title.length <= 500)) ||
                (error('Invalid type for tile, max length is 250 char'), false)
            ) && (
                (modInfo.attach_source_link === undefined || typeof modInfo.attach_source_link === 'boolean') ||
                (error('Invalid type for attach_source_link'), false)
            ) && (
                (modInfo.license === undefined || typeof modInfo.license === 'string') ||
                (error('Invalid type for license'), false)
            ) && (
                (modInfo.category === undefined || typeof modInfo.category === 'string') ||
                (error('Invalid type for category'), false)
            ) && (
                (modInfo.tags === undefined || (Array.isArray(modInfo.tags) &&
                    modInfo.tags.every(tag => typeof tag === 'string'))) ||
                (error('Invalid type for tags'), false)
            );
        if (isValid) {
            // If the types are valid, we can parse the content
            await this.parse();
        }
        return isValid;
    }

    private async parse(): Promise<void> {
        await this.parseDescription();
        await this.parseSummary();
        await this.parseTitle();
        await this.parseSourceLink();
        await this.parseLicense();
        await this.parseCategory();
        await this.parseTags();
    }

    /*
    * Parse the description file if it exists
    */
    private async parseDescription(): Promise<void> {
        if (!this.yamlContent.mod_info?.description_file)
            return this.modInfo.description = undefined;
        try {
            const descriptionFile = this.yamlContent.mod_info?.description_file;
            if (descriptionFile) {
                const descriptionFileFullPath = path.join(this.modDir, descriptionFile);
                const description = await readFile(descriptionFileFullPath, 'utf-8');
                this.modInfo.description = description;
            }
        } catch (error) {
            throw new Error(`Failed to read description file: ${error}`);
        }
    }

    /*
    * Parse the title field
    */
    private async parseSummary(): Promise<void> {
        if (!this.yamlContent.mod_info?.summary)
            return this.modInfo.summary = undefined;
        const summary = this.yamlContent.mod_info?.summary;
        this.modInfo.summary = summary;
    }

    /*
    * Parse the title field
    */
    private async parseTitle(): Promise<void> {
        if (!this.yamlContent.mod_info?.title)
            return this.modInfo.title = undefined;
        const title = this.yamlContent.mod_info?.title;
        this.modInfo.title = title;
    }

    /*
    * Parse the source link from the environment variables
    */

    private async parseSourceLink(): Promise<void> {
        if (!this.yamlContent.mod_info?.attach_source_link)
            return this.modInfo.sourceLink = undefined;
        const githubRepo = process.env.GITHUB_REPOSITORY;
        const githubServerUrl = process.env.GITHUB_SERVER_URL;
        if (!githubRepo) {
            warning('GITHUB_REPOSITORY is not set');
            return this.modInfo.sourceLink = undefined;
        }
        if (!githubServerUrl) {
            warning('GITHUB_SERVER_URL is not set');
            return this.modInfo.sourceLink = undefined;
        }
        this.modInfo.sourceLink = `${githubServerUrl}/${githubRepo}`;
    }

    /*
    * Parse the license field
    */
    private async parseLicense(): Promise<void> {
        if (!this.yamlContent.mod_info?.license)
            return this.modInfo.license = undefined;
        const license = this.yamlContent.mod_info?.license;
        this.modInfo.license = ValidateFactorioLicense(license);
    }

    /*
    * Parse the category field
    */
    private async parseCategory(): Promise<void> {
        if (!this.yamlContent.mod_info?.category)
            return this.modInfo.category = undefined;
        this.modInfo.category = ValidateFactorioCategory(this.yamlContent.mod_info?.category!);
    }

    /*
    * Parse the tags field
    */
    private async parseTags(): Promise<void> {
        if (!this.yamlContent.mod_info?.tags) {
            this.modInfo.tags = [];
            return;
        }
        const tags = this.yamlContent.mod_info?.tags;
        this.modInfo.tags = ValidateFactorioTags(tags)
    }

    /*
    * Factory method to create a FactorioModInfoParser from a file
    */
    public static async fromFile(filePath: string, modDir?: string): Promise<FactorioModInfoParser> {
        try {
            // Implementation would use fs.readFile and YAML parser
            let content = '';
            if (existsSync(filePath)) {
                content = await readFile(filePath, 'utf-8');
            }
            return new FactorioModInfoParser(content, modDir);
        } catch (error) {
            throw new Error(`Failed to read mod_info.yml: ${error}`);
        }
    }

    /**
     * Update the version field in mod_info.yml
     * The version is stored at the top-level 'version' key of the YAML document.
     */
    public updateVersion(newVersion: string): void {
        if (!this.yamlContent.mod_info) {
            this.yamlContent.mod_info = {};
        }
        (this.yamlContent as any).version = newVersion;
        info(`Version updated to ${newVersion}`);
    }

    /**
     * Save the current YAML content back to the mod_info.yml file.
     */
    public async saveToFile(filePath: string): Promise<void> {
        try {
            const yamlString = dump(this.yamlContent);
            await writeFile(filePath, yamlString, 'utf-8');
            info(`mod_info.yml saved to ${filePath}`);
        } catch (error) {
            throw new Error(`Failed to save mod_info.yml: ${error}`);
        }
    }
}