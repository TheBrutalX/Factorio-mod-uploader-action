import * as core from '@actions/core';
import { FACTORIOIGNORE_FILE_NAME, INPUT_AUTO_UPDATE_VERSION, INPUT_DOTIGNORE_FILE, INPUT_MOD_FOLDER, INPUT_MOD_NAME, PROCESS_GITHUB_REF, PROCESS_MOD_VERSION, PROCESS_ZIP_FILE } from '@constants';
import { FactorioIgnoreParser } from '@services/FactorioIgnoreParser';
import { FactorioModInfoParser } from '@services/FactorioModInfoParser';
import { zipDirectory } from '@utils/zipper';
import { existsSync } from 'node:fs';
import fsp from 'node:fs/promises';
import { posix as path } from 'node:path';
import BaseProcess from './baseProcess';
export default class CompressProcess extends BaseProcess {
    private modName: string = '';
    private modPath: string = '';
    private modVersion: string = '';
    private tmpPath: string = '';
    private dotignorefile!: string;
    private autoUpdateVersion: boolean = false;

    parseInputs(): void {
        this.modName = this.getInput(INPUT_MOD_NAME);
        this.modPath = this.getInput(INPUT_MOD_FOLDER);
        this.modVersion = this.getInput(PROCESS_MOD_VERSION);
        this.tmpPath = process.env.RUNNER_TEMP || '';
        if (!this.tmpPath) throw new Error('RUNNER-TEMP is required');
        this.dotignorefile = this.getInput(INPUT_DOTIGNORE_FILE, false);
        if (!this.dotignorefile) {
            this.debug(`No ${INPUT_DOTIGNORE_FILE} specified, using default ${FACTORIOIGNORE_FILE_NAME}`);
            this.dotignorefile = FACTORIOIGNORE_FILE_NAME;
        }
        this.autoUpdateVersion = this.getInputBoolen(INPUT_AUTO_UPDATE_VERSION, false);
    }
    async run(): Promise<void> {
        let dotignoreContent = '';
        const dotignorePath = path.normalize(path.join(this.modPath, this.dotignorefile));
        if (existsSync(dotignorePath)) {
            dotignoreContent = await fsp.readFile(dotignorePath, 'utf8');
        } else {
            core.warning(`No ${this.dotignorefile} found`);
            core.warning(`Please create a ${this.dotignorefile} file to specify which files to ignore`);
            core.warning(`For this action use the default ${FACTORIOIGNORE_FILE_NAME} file directive`);
            core.warning(`For more information visit the WIKI`);
        }

        // Auto-update version from GitHub release tag
        if (this.autoUpdateVersion) {
            const githubRef = process.env.GITHUB_REF || this.getInput(PROCESS_GITHUB_REF);
            const version = this.extractVersionFromRef(githubRef);
            if (version) {
                this.info(`Auto-updating version to ${version} (from GITHUB_REF: ${githubRef})`);
                const modInfoPath = path.normalize(path.join(this.modPath, 'mod_info.yml'));
                const parser = await FactorioModInfoParser.fromFile(modInfoPath, this.modPath);
                parser.updateVersion(version);
                await parser.saveToFile(modInfoPath);
                this.modVersion = version;
            } else {
                core.warning(`Could not extract version from GITHUB_REF: ${githubRef}. Falling back to existing version.`);
            }
        }

        const zipName = this.normalizedZipName();
        core.info(`Creating zip file: ${zipName}`);
        const zipDir = path.normalize(path.join(this.tmpPath, 'zip'));
        const modDir = path.normalize(path.join(zipDir, this.modName));
        if (existsSync(modDir)) {
            core.warning(`The directory ${modDir} already exists, deleting it`);
            await fsp.rm(modDir, { recursive: true });
        }
        const fip = new FactorioIgnoreParser(dotignoreContent);
        const patters = fip.getPatterns();
        for (const pattern of patters) {
            this.debug(`Pattern: ${pattern.pattern}`);
        }
        await fip.copyNonIgnoredFiles(this.modPath, modDir);
        const zipPath = path.normalize(`${this.tmpPath}/${zipName}`);
        const absolutePath = await zipDirectory(zipDir, zipPath);
        await fsp.rm(zipDir, { recursive: true });
        this.info(`Zip file created: ${absolutePath}`);
        this.exportVariable(PROCESS_ZIP_FILE, absolutePath);
    }

    private normalizedZipName(): string {
        const modName = this.modName.replace(/[^a-z0-9_-]/gi, '-');
        return `${modName}_${this.modVersion}.zip`;
    }

    /**
     * Extract version tag from GITHUB_REF.
     * Handles refs like 'refs/tags/v1.2.3' or 'refs/tags/1.2.3'.
     */
    private extractVersionFromRef(githubRef: string): string | null {
        if (!githubRef) return null;
        const tagMatch = new RegExp(/^refs\/tags\/(.+)$/).exec(githubRef);
        if (!tagMatch) return null;
        let version = tagMatch[1];
        // Strip leading 'v' if present (e.g., 'v1.2.3' -> '1.2.3')
        if (version.startsWith('v')) {
            version = version.slice(1);
        }
        return version;
    }
}