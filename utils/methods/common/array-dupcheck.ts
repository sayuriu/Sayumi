export default function DuplicationCheck<T>(array: T[], type = 'Item', WarnArray: string[] = []): T[]
{
	if (!WarnArray) WarnArray = null;
	if (!type) type = 'Item';
	if (typeof type !== 'string') throw new TypeError('[Global Functions > Duplication Check] The type specified is not a string.');
	type = type.replace(type.substr(0, 1), type.substr(0, 1).toUpperCase());
	const findDuplicates = (arr: T[]) => arr.filter((item, index) => arr.indexOf(item) != index);
	const res = [...new Set(findDuplicates(array))];
	if (res.length)
	{
		for(const i of res)
		{
			if (WarnArray.length > 0) WarnArray.push(`${type} "${i.toString()}": Duplicates found.`);
		}
		return res;
	}
}