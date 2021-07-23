export default function StringLimiter(input1 = '', input2 = '', seperator = '.', stringLimit = input1.length): string
{
	if (stringLimit <= 0) return input1 + input2;
	const fill = stringLimit - (input1.length + input2.length);

	if (fill < 0) return input1.substr(0, stringLimit - input2.length - 7) + '(...)' + seperator + seperator + input2 || input1 + input2;

	return input1.padEnd(stringLimit - input2.length, seperator) + input2;
}