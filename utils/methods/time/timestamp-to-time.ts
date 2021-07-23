export default function(timestamp: number): ParsedTime
{
	if (typeof timestamp !== 'number') throw new TypeError('The input must be a number.');
	if (timestamp > Date.now()) timestamp = Date.now();

	const hours = Math.floor(timestamp / 3600000) % 24;
	const minutes = Math.floor(timestamp / 60000) % 60;
	const seconds = Math.floor(timestamp / 1000) % 60;

	return { hours,  minutes, seconds };
}

interface ParsedTime
{
	hours: number;
	minutes: number;
	seconds: number;
}