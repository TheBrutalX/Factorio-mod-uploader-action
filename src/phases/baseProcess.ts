import { debug, error, exportVariable, getInput, info, InputOptions, setFailed, warning } from '@actions/core';
import { IBaseProcess } from '@interfaces/IBaseProcess';

export default abstract class BaseProcess implements IBaseProcess {
    abstract parseInputs(): void;

    abstract run(): Promise<void>;

    protected getInput(
        name: string,
        required: boolean = true,
        inputOption: InputOptions = {},
    ): string {
        // Get the input value from env if exists
        // For env, the name is uppercased and '-' is replaced with '_'
        // For example, input name 'mod-name' will be 'MOD_NAME
        const enviromentName = this.getCorrectEnvName(name);
        const enviromentValue = this.findByKeyInsensitive(enviromentName);
        if (enviromentValue) return enviromentValue;
        const userValue = getInput(enviromentName, inputOption);
        // If the value is required and not provided, throw an error
        if (required && !userValue) {
            throw new Error(`Input required and not supplied: ${name}`);
        }
        if (!required && !userValue) {
            debug(`Input not required and not supplied: ${name}`);
        }
        // if user value is provided, return it
        if (userValue) return userValue;
        else return '';
    }

    private getEnvNameWithHyphen(envName: string): string {
        return envName.split('-').join('_').toUpperCase();
    }
    private getEnvNameWithUnderscore(envName: string): string {
        return envName.split('_').join('-').toUpperCase();
    }

    private environmentVariableExists(envName: string): boolean {
        return Object.keys(process.env).some((key: string) => key.toUpperCase() === envName.toUpperCase());
    }

    private getCorrectEnvName(envName: string, prefix?: string): string {
        if (!prefix) prefix = '';
        const hyphenName = this.getEnvNameWithHyphen(envName);
        const hyphenWithPrefix = prefix + hyphenName;
        const underscoreName = this.getEnvNameWithUnderscore(envName);
        const underscoreWithPrefix = prefix + underscoreName;
        if (this.environmentVariableExists(hyphenWithPrefix)) {
            return hyphenName;
        } else if (this.environmentVariableExists(underscoreWithPrefix)) {
            return underscoreName;
        } else if (prefix) {
                return envName;
            } else {
                return this.getCorrectEnvName(envName, 'INPUT_');
            }
    }

    private findByKeyInsensitive(key: string): string | undefined {
        return Object.entries(process.env).find(([envKey]) => envKey.toLowerCase() === key.toLowerCase())?.[1];
    }

    protected getInputBoolen(
        name: string,
        defaultVal: boolean,
        required: boolean = true,
        inputOption: InputOptions = {}
    ): boolean {
        const value = this.getInput(name, required, inputOption);
        if (!value) return defaultVal;
        // Check if valid boolean value
        if (value.toLowerCase() !== 'true' && value.toLowerCase() !== 'false') {
            throw new Error(`Invalid boolean value: ${name}`);
        }
        return value.toLowerCase() === 'true';
    }

    protected debug(message: string): void {
        debug(message);
    }

    protected info(message: string): void {
        info(message);
    }

    protected warning(message: string): void {
        warning(message);
    }

    protected error(message: string): void {
        error(message);
    }

    protected exportVariable(name: string, value: string): void {
        exportVariable(name, value);
    }

    protected setFailed(message: string): void {
        setFailed(message);
    }
}
