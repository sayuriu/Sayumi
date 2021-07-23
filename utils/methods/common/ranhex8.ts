export default function RandomHex8Str(): string
{
	return Math.random().toString(16).substr(0, 10).toUpperCase().replace(/\./g, 'x');
}