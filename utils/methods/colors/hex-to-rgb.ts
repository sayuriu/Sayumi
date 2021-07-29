export default function HexToRGB(hex: `#${string}`): [number, number, number]
{
	if (hex.length !== 7) throw 'paint bucket';
	const r = Math.floor(parseInt(`0x${hex.substr(1, 2)}0000`) / 0xff0000 * 255);
	const g = Math.floor(parseInt(`0x${hex.substr(3, 2)}00`) / 0xff00 * 255);
	const b = Math.floor(parseInt(`0x${hex.substr(5, 2)}`) / 0xff * 255);

	return [r, g, b];
}