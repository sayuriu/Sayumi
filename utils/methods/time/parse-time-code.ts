export default function ParseTimeCode(input = ''): number | 'out-of-scope' | 'invalid'
{
	if (!isNaN(parseInt(input)))
	{
		const array:string[] = [];
		input.split(':').forEach(e => {
			if (!e || isNaN(parseInt(e))) return;
			array.push(e.trim());
		});
		const negative = array[0].startsWith('-');
		if (negative) array[0] = array[0].substr(1, array[0].length);
		let out;
		switch (array.length)
		{
			// s
			case 1:
			{
				out = parseInt(array[0]);
				break;
			}
			// m, s
			case 2:
			{
				const [m, s] = array;
				out = parseInt(m) * 60 + parseInt(s);
				break;
			}
			// h, m, s
			case 3:
			{
				const [h, m, s] = array;
				out = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
				break;
			}
			// d, h, m, s
			case 4:
			{
				const [d, h, m, s] = array;
				out = parseInt(d) * 864000 + parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
				break;
			}
			default: return 'out-of-scope';
		}
		return (negative ? -1 : 1) * out;
	}
	return 'invalid';
}