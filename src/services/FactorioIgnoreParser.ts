import { warning } from "@actions/core";
import { FACTORIOIGNORE_FILE_NAME } from "@constants";
import { IFactorioIgnoreRule } from "@interfaces/IFactorioIgnoreRule";
import { debug } from "console";
import { promises as fs } from "fs";
import { join } from "path/posix";


export class FactorioIgnoreParser {
    private static readonly INVALID_CHART_FOR_LINE = /[^a-zA-Z0-9.*!\_\-?/\\]/g;

    private static readonly DEFAULT_PATTERNS: string[] = [
        FACTORIOIGNORE_FILE_NAME, // Ignore factorioignore file
        '.git', // Ignore git directory
        '.github', // Ignore github directory
        '.gitignore', // Ignore gitignore file
        '.vscode', // Ignore vscode directory
        '*.tmp', // Ignore tmp files and dir (e.g. file.tmp and dir.tmp)
        '*.log', // Ignore log files (e.g. debug.log)
        '*.bak', // Ignore backup files (e.g. file.bak)
    ];

    private readonly patterns: Set<IFactorioIgnoreRule> = new Set();

    constructor(ignoreContent: string, addDefaultPatterns = true) {
        if (ignoreContent) {
            this.parseContent(ignoreContent);
        }
        if (addDefaultPatterns) {
            this.setDefaultPatterns();
        }
    }

    /**
     * Parses the ignore file content and adds patterns to the internal list.
     * @param ignoreContent The content of the ignore file.
     */
    private parseContent(ignoreContent: string): void {
        const lines = ignoreContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Ignore comments
            if (trimmedLine.startsWith('#')) continue;
            const sanitizedLine = this.sanitizePattern(trimmedLine);
            // Ignore empty lines
            if (!sanitizedLine) continue;

            this.addPattern(sanitizedLine);
        }
    }

    /**
   * Sanitizes a pattern by replacing unsupported characters for .factorioignore.
   * @param pattern The original pattern.
   * @returns The sanitized pattern.
   */
    private sanitizePattern(pattern: string): string {
        return pattern.replace(FactorioIgnoreParser.INVALID_CHART_FOR_LINE, '') // Remove unsupported characters
            .replace(/\\/g, '/') // Replace backslashes with forward slashes
            .toLocaleLowerCase(); // Convert to lowercase for case-insensitive matching
    }
    /**
     * Adds a single pattern to the list after converting it to a regex.
     * @param trimmedLine The trimmed pattern line from the ignore file.
     */
    private addPattern(trimmedLine: string): void {
        const isNegated = trimmedLine[0] == '!';
        let pattern = isNegated ? trimmedLine.substring(1).trim() : trimmedLine;
        if (pattern === '**') {
            // Match everything
            // This is a special case, as it should match everything, including directories
            // For this reason, we don't add a regex for this pattern
            warning('The pattern "**" is not supported in .factorioignore files. Ignoring this pattern.');
            return;
        }
        // Escape dots in the pattern
        pattern = pattern
            .replace(/[.]/g, `\\.`) // Replace '.' with '\.'
            .replace(/[?]/g, '.') // Replace '?' with '.'
        // Root-relative pattern
        if (pattern[0] == '/') {
            pattern = pattern.replace(/^\//, '^');
        }
        // Match any directory depth, including the root directory
        if (pattern.startsWith('**/')) {
            pattern = pattern.replace('**/', '(.*\\/)?');
        }
        // Match directories in the middle
        if (pattern.includes('/**/')) {
            pattern = pattern.replace('/**/', '/(.*/)?');
        }
        // Match any character in a directory or file name
        if (pattern.endsWith('/**')) {
            pattern = pattern.replace('/**', '(\/.*)?');
        }

        let escapedPattern = pattern
            .replace(/(?<!\.)\*/g, '.*') // Replace '*' with '.*'
            .replace(/(?<!\\)\//g, '\\/') // Ensure directory separators are correct

        // Handle directory-specific patterns
        if (escapedPattern.endsWith('/')) {
            escapedPattern = escapedPattern.replace(/\/$/, '.*');
        }
        const regexString = `${escapedPattern}`;
        const checkIfExists = Array.from(this.patterns).find((p) => p.pattern === trimmedLine);
        if (checkIfExists) {
            return;
        }
        this.checkIfExsitsOpposite(trimmedLine, isNegated);
        const regex = new RegExp(regexString, 'i');
        this.patterns.add({
            pattern: trimmedLine,
            isNegated,
            regex: regex,
        });
    }
    /**
     * Check if the opposite of the pattern exists in the list.
     * @param trimmedLine The trimmed pattern line from the ignore file.
     * @param isNegated if the current pattern is negated.
     */
    checkIfExsitsOpposite(trimmedLine: string, isNegated: boolean) {
        const opposite = isNegated ? trimmedLine.substring(1).trim() : `!${trimmedLine}`;
        const checkIfExists = Array.from(this.patterns).find((p) => p.pattern === opposite);
        if (checkIfExists) {
            // Remove the opposite pattern from the list
            this.patterns.delete(checkIfExists);
            // Warn the user that the pattern is being re-ignored
            warning(`The pattern "${trimmedLine}" is being re-ignored after being negated by the pattern "${checkIfExists.pattern}".`);
        }
    }

    /**
     * Checks if a given file path matches any ignore pattern.
     * @param filePath The file path to check.
     * @param basePath The base path to use for relative paths.
     * @returns True if the file path is ignored, otherwise false.
     */
    public shouldIgnore(filePath: string): boolean {
        let ignored = false;
        // Convert the file path to a relative path from the current working directory
        filePath = filePath.replace(process.cwd(), '').replace(/^[/\\]/, '');

        for (const { isNegated, regex } of this.patterns) {
            if (regex.test(filePath)) {
                ignored = !isNegated;
            }
        }

        return ignored;
    }

    /**
     * Clears all patterns from the parser.
     */
    public clear(): void {
        this.patterns.clear();
    }

    /**
     * Gets the list of parsed patterns with their regex.
     * @returns The parsed patterns and their regex equivalents.
     */
    public getPatterns(): IFactorioIgnoreRule[] {
        return Array.from(this.patterns);
    }

    /**
     * Sets the default ignore rules.
     */
    private setDefaultPatterns(): void {
        for (const pattern of FactorioIgnoreParser.DEFAULT_PATTERNS) {
            this.addPattern(pattern)
        }
    }

    /**
     * Copies all files from the source directory to the destination directory,
     * excluding any files that match the ignore patterns.
     * @param source The source directory to copy files from.
     * @param destination The destination directory to copy files to.
     */
    public async copyNonIgnoredFiles(
        source: string,
        destination: string,
    ): Promise<string[]> {
        return this.copyNonIgnoredFilesRecursive(source, destination);
    }

    private async copyNonIgnoredFilesRecursive(
        source: string,
        destination: string,
    ): Promise<string[]> {
        const copiedFiles: string[] = new Array();
        const files = await fs.readdir(source);
        await fs.mkdir(destination, { recursive: true });
        for (const file of files) {
            const filePath = join(source, file);
            debug(`Processing file ${file} (${source}) to ${destination}`);
            const destinationPath = join(destination, file);
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                const copied = await this.copyNonIgnoredFilesRecursive(filePath, destinationPath);
                copiedFiles.push(...copied);
            } else {
                if (!this.shouldIgnore(filePath)) {
                    await fs.copyFile(filePath, destinationPath);
                    copiedFiles.push(filePath);
                    debug(`Copied file ${file} to ${destinationPath}`);
                } else {
                    debug(`Ignoring file ${file}`);
                }
            }

        }
        return copiedFiles;
    }
}