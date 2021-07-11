import { error } from '../../Logger';
export default function GetRandomize<T>(input: T[]): T
{
	if (!input || !input.length)
	{
		error('[Global Functions > Responses] The input is undefined!');
		return null;
	}
	const output = input[Math.floor(Math.random() * input.length)];
	return output;
}