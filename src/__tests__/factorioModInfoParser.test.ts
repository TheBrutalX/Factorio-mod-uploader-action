import { FactorioModInfoParser } from '@services/FactorioModInfoParser';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
    let tempDir: string;

    beforeEach(async () => {
        process.env.GITHUB_REPOSITORY = 'test/repo';
        process.env.GITHUB_SERVER_URL = 'http://test.com';
        tempDir = join(tmpdir(), 'factorio-test-' + Math.random());
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
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
            fs.readFile = jest.fn().mockResolvedValue('# Test Description');
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
            const filePath = join(tempDir, 'mod_info.yml');
            await fs.writeFile(filePath, 'mod_info:\n  title: Test');
            const parser = await FactorioModInfoParser.fromFile(filePath, '.');
            expect(parser).toBeInstanceOf(FactorioModInfoParser);
        });

        it('should handle non-existent file', async () => {
            const parser = await FactorioModInfoParser.fromFile('/non/existent/path', '.');
            expect(parser).toBeInstanceOf(FactorioModInfoParser);
        });
    });

    describe('parsing', () => {
        it('should parse description file', async () => {

            const descPath = join(tempDir, 'desc.md');
            await fs.writeFile(descPath, '# Test Description');
            const yaml = `
                mod_info:
                    description_file: ${descPath}
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
});