/* eslint-disable no-inline-comments */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export default function UpdateClockSpeed(newms: number): void
{
	clearInterval(global.TerminalClock);
	global.TerminalClock = setInterval(InternalClock, newms);
	return;
}


export function InternalClock(x = process.stdout.columns - 25, y = process.stdout.rows): void
{
	const timestamp = Date.now();
	const day = Math.floor(timestamp / 86400000);
	let hour: string | number = Math.floor(timestamp / 3600000) % 24;
	const minute: string | number = Math.floor(timestamp / 60000) % 60;
	const second: string | number = Math.floor(timestamp / 1000) % 60;
	const offset = new Date().getTimezoneOffset();
	const offsetH: string | number = Math.floor(offset / 60) * -1;
	const offsetM: string | number = Math.abs(Math.floor(offset % 60));
	hour += offsetH;
	if (hour >= 24) hour -= 24;
	let mod = 'AM';
	if (hour >= 12)
		mod = 'PM';

	const out = /* italic(*/background('#151515')([
		foreground('#8a8a8a')('['),
		foreground('#2296e3')(day.toString()),
		foreground('#8a8a8a')(']'),
		' ',
		// foreground('#8a8a8a')('<'),
		bold(foreground('#29cccc')(hour.toString().padStart(2, '0')), '#151515'),
		// '\u001b[3m',
		foreground('#7a7a7a')(':'),
		bold(foreground('#29cccc')(minute.toString().padStart(2, '0')), '#151515'),
		// '\u001b[3m',
		foreground('#7a7a7a')(':'),
		foreground('#7a7a7a')(second.toString().padStart(2, '0')),
		' ',
		// '\u001b[3m',
		foreground('#2bc45e')(mod),
		foreground('#7a7a7a')(`${offset < 0 ? '+' : '-'}${offsetH.toString().padStart(2, '0')}${offsetM.toString().padStart(2, '0')}`),
		// foreground('#8a8a8a')('>'),
		'\u001b[0m',
	].join(''))/* )*/;
	process.stdout.cursorTo(x, y);
	process.stdout.write(out);
}

function HexToRGB(hex: `#${string}`)
{
	if (hex.length !== 7) throw 'paint bucket';
	const r = Math.floor(parseInt(`0x${hex.substr(1, 2)}0000`) / 0xff0000 * 255);
	const g = Math.floor(parseInt(`0x${hex.substr(3, 2)}00`) / 0xff00 * 255);
	const b = Math.floor(parseInt(`0x${hex.substr(5, 2)}`) / 0xff * 255);

	return [r, g, b];
}

const foreground = (hex: `#${string}`) =>  (string: string) => `\u001b[38;2;${HexToRGB(hex).join(';')}m${string}\u001b[39m`;
const background = (hex: `#${string}`) =>  (string: string) => `\u001b[48;2;${HexToRGB(hex).join(';')}m${string}\u001b[49m`;
const bold = (string: string, patchBGHex?: `#${string}`) => `\u001b[1m${string}\u001b[0m` + (patchBGHex ? `\u001b[48;2;${HexToRGB(patchBGHex).join(';')}m` : '');
const italic = (string: string, patchBGHex?: `#${string}`) => `\u001b[3m${string}\u001b[0m` + (patchBGHex ? `\u001b[48;2;${HexToRGB(patchBGHex).join(';')}m` : '');


// ansi codes, format \u001b[X;X;Xm(chars)
/**
*
*	0		Reset / Normal						all attributes off
*	1		Bold or increased intensity
*	2		Faint (decreased intensity)			Not widely supported.
*	3		Italic								Not widely supported. Sometimes treated as inverse.
*	4		Underline
*	5		Slow Blink							less than 150 per minute
*	6		Rapid Blink							MS-DOS ANSI.SYS; 150+ per minute; not widely supported
*	7		[[reverse video]]					swap foreground and background colors
*	8		Conceal								Not widely supported.
*	9		Crossed-out							Characters legible, but marked for deletion. Not widely supported.
*	10		Primary(default) 					font
*	11–19	Alternate font						Select alternate font n-10
*	20		Fraktur								hardly ever supported
*	21		Bold off or Double Underline		Bold off not widely supported; double underline hardly ever supported.
*	22		Normal color or intensity			Neither bold nor faint
*	23		Not italic, not Fraktur
*	24		Underline off						Not singly or doubly underlined
*	25		Blink off
*	27		Inverse off
*	28		Reveal	conceal off
*	29		Not crossed out
*	// 30–37	Set foreground color				See color table
*	38		Set foreground color				Next arguments are 5;<n> or 2;<r>;<g>;<b>
*	39		Default foreground color			implementation defined (according to standard)
*	// 40–47	Set background color				See color table
*	48		Set background color				Next arguments are 5;<n> or 2;<r>;<g>;<b>
*	49		Default background color			implementation defined (according to standard)
*	51		Framed
*	52		Encircled
*	53		Overlined
*	54		Not framed or encircled
*	55		Not overlined
*	60		ideogram underline					hardly ever supported
*	61		ideogram double underline			hardly ever supported
*	62		ideogram overline					hardly ever supported
*	63		ideogram double overline			hardly ever supported
*	64		ideogram stress marking				hardly ever supported
*	65		ideogram attributes off				reset the effects of all of 60-64
*	90–97	Set bright foreground color			aixterm (not in standard)
*	100–107	Set bright background color			aixterm (not in standard)
 */