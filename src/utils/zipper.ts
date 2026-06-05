import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Compresses the specified directory into a .zip file
 * @param sourceDir - Path to the directory to compress
 * @param outPath - Path where the .zip file should be saved
 */
export async function zipDirectory(
    sourceDir: string,
    outPath: string
): Promise<string> {
    outPath = resolve(outPath);
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    // from relative path to absolute path
    return new Promise((resolve, reject) => {
        output.on('close', () => resolve(output.path as string));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}
