import HexToRGB from "../colors/hex-to-rgb";

export const foreground = (hex: `#${string}`) =>  (string: string): string => `\u001b[38;2;${HexToRGB(hex).join(';')}m${string}\u001b[39m`;
export const background = (hex: `#${string}`) =>  (string: string): string => `\u001b[48;2;${HexToRGB(hex).join(';')}m${string}\u001b[49m`;
export const bold = (string: string, patchBGHex?: `#${string}`): string => `\u001b[1m${string}\u001b[0m` + (patchBGHex ? `\u001b[48;2;${HexToRGB(patchBGHex).join(';')}m` : '');
export const italic = (string: string, patchBGHex?: `#${string}`): string => `\u001b[3m${string}\u001b[0m` + (patchBGHex ? `\u001b[48;2;${HexToRGB(patchBGHex).join(';')}m` : '');
const ANSIStyles = {
	foreground,
	background,
	bold,
	italic,
};
export default ANSIStyles;