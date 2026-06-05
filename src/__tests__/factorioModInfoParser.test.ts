import { FactorioModInfoParser } from '@services/FactorioModInfoParser';

jest.mock('node:fs', () => ({
    existsSync: jest.fn()
}));

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockRm = jest.fn();

jest.mock('node:fs/promises', () => ({
    readFile: (...args: any[]) => mockReadFile(...args),
    writeFile: (...args: any[]) => mockWriteFile(...args),
    mkdir: (...args: any[]) => mockMkdir(...args),
    rm: (...args: any[]) => mockRm(...args)
}));

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

describe('FactorioModInfoParser', () => {
    let tempDir: string = '/tmp/factorio-test';

    beforeEach(() => {
        process.env.GITHUB_REPOSITORY = 'test/repo';
        process.env.GITHUB_SERVER_URL = 'http://test.com';
        mockReadFile.mockClear();
        mockWriteFile.mockClear();
        mockMkdir.mockClear();
        mockRm.mockClear();
    });

    afterEach(async () => {
        // Clean up temp directory using real fs
        const { rm } = await import('node:fs/promises');
        try { await rm(tempDir, { recursive: true, force: true }); } catch {}
    });

    describe('constructor', () => {
        it('should create instance with empty content', () => {
            const parser = new FactorioModInfoParser('');
            expect(parser).toBeInstanceOf(FactorioModInfoParser);
        });

        it('should throw error on invalid YAML', () => {
            expect(() => new FactorioModInfoParser('invalid: yaml: content:')).toThrow();
        });
    });

    describe('validate', () => {
        it('should validate empty config', async () => {
            const parser = new FactorioModInfoParser('');
            expect(await parser.validate()).toBe(true);
        });

        it('should validate valid config', async () => {
            mockReadFile.mockResolvedValue('# Test Description');
            const yaml = `
                mod_info:
                    title: Test Mod
                    summary: Test summary
                    description_file: desc.md
                    attach_source_link: true
                    license: MIT
                    category: utility
                    tags: ["test", "utility"]
            `;
            const parser = new FactorioModInfoParser(yaml);
            expect(await parser.validate()).toBe(true);
        });

        it('should fail on invalid summary length', async () => {
            const yaml = `
                mod_info:
                    summary: ""
            `;
            const parser = new FactorioModInfoParser(yaml);
            expect(await parser.validate()).toBe(false);
        });

        it('should fail on invalid title length', async () => {
            const yaml = `
                mod_info:
                    title: ${'x'.repeat(501)}
            `;
            const parser = new FactorioModInfoParser(yaml);
            expect(await parser.validate()).toBe(false);
        });
    });

    describe('fromFile', () => {
        it('should create instance from file', async () => {
            mockReadFile.mockResolvedValue('mod_info:\n  title: Test');
            const parser = await FactorioModInfoParser.fromFile('/some/path', '.');
            expect(parser).toBeInstanceOf(FactorioModInfoParser);
        });

        it('should handle non-existent file', async () => {
            mockReadFile.mockResolvedValue('');
            const parser = await FactorioModInfoParser.fromFile('/non/existent/path', '.');
            expect(parser).toBeInstanceOf(FactorioModInfoParser);
        });
    });

     describe('parsing', () => {
        it('should parse description file', async () => {
            mockReadFile.mockResolvedValue('# Test Description');
            const yaml = `
                mod_info:
                    description_file: desc.md
            `;

            const parser = new FactorioModInfoParser(yaml, tempDir);
            await parser.validate();
            expect(parser.getFullInfo().description).toBe('# Test Description');
        });

        it('should parse source link', async () => {
            process.env.GITHUB_REPOSITORY = 'user/repo';
            process.env.GITHUB_SERVER_URL = 'https://github.com';

            const yaml = `
                mod_info:
                    attach_source_link: true
            `;
            const parser = new FactorioModInfoParser(yaml);
            await parser.validate();
            expect(parser.getFullInfo().sourceLink).toBe('https://github.com/user/repo');
        });

        it('should validate license', async () => {
            const yaml = `
                mod_info:
                    license: MIT
            `;
            const parser = new FactorioModInfoParser(yaml);
            await parser.validate();
            expect(parser.getFullInfo().license).toBe('default_mit');
        });

        it('should validate category', async () => {
            const yaml = `
                mod_info:
                    category: internal
            `;
            const parser = new FactorioModInfoParser(yaml);
            await parser.validate();
            expect(parser.getFullInfo().category).toBe('internal');
        });

        it('should validate tags', async () => {
            const yaml = `
                mod_info:
                    tags: ["circuit-network", "logistic-network", "cheats", "test"]
            `;
            const parser = new FactorioModInfoParser(yaml);
            await parser.validate();
            expect(parser.getFullInfo().tags).toEqual(["circuit-network", "logistic-network", "cheats" ]);
        });
    });

    describe('updateVersion', () => {
        it('should update version in mod_info', () => {
            const yaml = `
                mod_info:
                    title: Test Mod
            `;
            const parser = new FactorioModInfoParser(yaml);
            parser.updateVersion('2.0.0');
            // Access internal yamlContent via any cast
            expect((parser as any).yamlContent.version).toBe('2.0.0');
        });

        it('should create mod_info section if not present', () => {
            const parser = new FactorioModInfoParser('');
            parser.updateVersion('1.0.0');
            expect((parser as any).yamlContent.mod_info).toBeDefined();
            expect((parser as any).yamlContent.version).toBe('1.0.0');
        });
    });

    describe('saveToFile', () => {
        it('should save updated yaml to file', async () => {
            mockWriteFile.mockResolvedValue(undefined);

            const yaml = `
                mod_info:
                    title: Test Mod
            `;
            const parser = new FactorioModInfoParser(yaml);
            parser.updateVersion('3.0.0');
            const filePath = '/output/mod_info.yml';
            await parser.saveToFile(filePath);

            expect(mockWriteFile).toHaveBeenCalledWith(filePath, expect.stringContaining('version'), 'utf-8');
        });
    });
});