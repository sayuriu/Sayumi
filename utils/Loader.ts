import { Errors } from "@methods/common/parse-errors";

interface DirIndex
{
	size?: number;
	invalidNames?: string[];
	noFunc?: string[];
	emptyFiles?: string[];
	errored?: Errors[];
	EntriesToCMD?: string[];
}

type AllowedTypes = 'cmd' | 'evt' | 'slash';

export default class Loader
{
	readonly mainRoot: string;
	dirIndex: DirIndex;

	// stdout
	loaded: number;
	empty: number;
	path: string;
	type: AllowedTypes;
	stdoutSignalSend: (signal: string) => boolean;
}