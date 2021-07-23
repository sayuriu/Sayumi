type AllowedTypes =
	'days' | 'day' | 'd'
	| 'hours' | 'hour' | 'h'
	| 'minutes' | 'minute' | 'min' | 'm'
	| 'seconds' | 'second' | 'sec' | 's';

const AllowedAttributes = [
	'days', 'day', 'd',
	'hours', 'hour', 'h',
	'minutes', 'minute', 'min', 'm',
	'seconds', 'second', 'sec', 's',
];

type Time = {
	[key in AllowedTypes]?: number;
};

export default function formatTime(time: Time, format?: string): string
{
	let str = '';
	for (const k in time)
	{
		if (AllowedAttributes.includes(k) && time[k]) str += `${time[k]}${k.substr(0, 1).toLowerCase()}`;
	}
	return str;
}
