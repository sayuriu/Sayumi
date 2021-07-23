type ToStringSomehow<T> = (item: T, index: number) => string;
interface PageGeneratorRules
{
	startFromIndex?: number;
	itemsPerPage?: number;
	charsPerPage?: number;
}

type Pages = [string, string, number[]][] & { len: number }

export default function generatePages<T>(items: T[], fn: ToStringSomehow<T>, ruleset: PageGeneratorRules = {}): Pages
{
	const { startFromIndex = 0, itemsPerPage = null, charsPerPage = 1024 } = ruleset;
	const out: [string, string, number[]][] = [];
	const indexes: number[] = [];
	let modCounter = 0;
	let pointer = 0;
	let startIndex = 0;

	let tempString = '';
	let indexRange: string;

	for (let i = startFromIndex; i < items.length; i++)
	{
		const additionalString = fn(items[i], i);
		if (((tempString + additionalString).length > charsPerPage) || (modCounter && modCounter % itemsPerPage === 0))
		{
			modCounter = 0;
			if (pointer < 1)
			{
				const count = i - startIndex;
				indexRange = `the first${count > 1 ? ` ${count}` : ''}`;
			}
			else indexRange = `${startIndex + 1} to ${i}`;
			out[pointer] = [indexRange, tempString, indexes];
			pointer++;
			startIndex = i;
			tempString = '';
		}
		modCounter++;
		tempString += additionalString;
		indexes.push(i);
	}
	if (pointer) indexRange = `the last ${items.length - startIndex}`;
	else indexRange = 'all';
	out[pointer] = [indexRange, tempString, indexes];
	return Object.assign(out, { len: items.length });
}
