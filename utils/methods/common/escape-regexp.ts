export default function EscapeRegex(input: string): string
{
	return input.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}