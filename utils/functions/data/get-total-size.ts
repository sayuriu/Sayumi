import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import convertBytes from './convert-bytes';

function getAllFiles(path): string[]
{
	const files = readdirSync(path);
	let arrayOfFiles: string[] = [];

	files.forEach(file => {
		const fullPath = join(path, file);
		if (statSync(fullPath).isDirectory())
			arrayOfFiles = getAllFiles(fullPath);
		else arrayOfFiles.push(join(path, file));
	});

	return arrayOfFiles;
}

export default function getTotalSize(path: string): string
{
	const arrayOfFiles = getAllFiles(path);
	let totalSize = 0;

	arrayOfFiles.forEach(filePath => totalSize += statSync(filePath).size);
	return convertBytes(totalSize);
}