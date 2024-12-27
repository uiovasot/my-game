import fs from 'fs/promises';
import path from 'path';

export async function folderImport<T extends {default?: any} & any>(folder: string): Promise<T[]> {
    const folderPath = path.join(import.meta.dirname, '../', folder);

    try {
        const files = await fs.readdir(folderPath);
        const exports: T[] = [];

        for (const file of files.filter((file) => file.endsWith('.ts'))) {
            exports.push(await import(path.join(folderPath, file)));
        }

        return exports;
    } catch (err) {
        throw err;
    }
}
