import { zipDirectory } from '@utils/zipper';
import { mkdtempSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';

// Mock archiver since it is ESM-only and Jest cannot transform it
let mockArchiveOnCapture: { event: string; cb: Function } | null = null;
const mockPipe = jest.fn(function (this: any, output: Writable) {
    // Simulate successful completion by emitting close on the output stream
    // after a microtask delay
    process.nextTick(() => output.emit('close'));
});
const mockDirectory = jest.fn();
const mockFinalize = jest.fn();
const mockOn = jest.fn((event: string, cb: Function) => {
    mockArchiveOnCapture = { event, cb };
});

jest.mock('archiver', () => ({
    ZipArchive: jest.fn().mockImplementation(() => ({
        pipe: mockPipe,
        directory: mockDirectory,
        finalize: mockFinalize,
        on: mockOn,
    })),
}));

describe('zipDirectory', () => {
    let tempDir: string;
    let sourceDir: string;
    let outputDir: string;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'zipper-test-'));
        sourceDir = join(tempDir, 'source');
        outputDir = join(tempDir, 'output');
        mkdirSync(sourceDir, { recursive: true });
        mkdirSync(outputDir, { recursive: true });
        mockArchiveOnCapture = null;
        jest.clearAllMocks();

        // Restore default mock behavior: pipe triggers close on the output stream
        mockPipe.mockImplementation(function (this: any, output: Writable) {
            process.nextTick(() => output.emit('close'));
            return this;
        });

        // Create some test files
        writeFileSync(join(sourceDir, 'file1.txt'), 'content1');
        writeFileSync(join(sourceDir, 'file2.lua'), 'content2');
        mkdirSync(join(sourceDir, 'subdir'), { recursive: true });
        writeFileSync(join(sourceDir, 'subdir', 'file3.txt'), 'content3');
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    it('should create a zip file from directory', async () => {
        const zipPath = join(outputDir, 'test.zip');
        const result = await zipDirectory(sourceDir, zipPath);

        expect(result).toBe(zipPath);
        expect(existsSync(zipPath)).toBe(true);
        expect(mockDirectory).toHaveBeenCalledWith(sourceDir, false);
        expect(mockFinalize).toHaveBeenCalled();
    });

    it('should return the absolute path when relative path is given', async () => {
        const zipPath = 'test-output.zip';
        const result = await zipDirectory(sourceDir, zipPath);

        expect(result).toMatch(/test-output\.zip$/);
        expect(existsSync(result)).toBe(true);
    });

    it('should reject on archive error', async () => {
        // Override mockOn to trigger error instead of capturing events
        mockOn.mockReset();
        mockOn.mockImplementation((event: string, cb: Function) => {
            if (event === 'error') {
                process.nextTick(() => cb(new Error('Archive error')));
            }
        });

        const zipPath = join(outputDir, 'test.zip');
        await expect(zipDirectory(sourceDir, zipPath)).rejects.toThrow('Archive error');
    });
});
