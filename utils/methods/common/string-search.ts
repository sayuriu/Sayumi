export default function SearchString(regEx = /\u200b/g, string = ''): number[]
{
	// regEx = new RegExp(regEx.replace(/([\\.+*?\\[^\\]$(){}=!<>|:])/g, '\\$1'));
	const indice: number[] = [];
	let res: RegExpExecArray;
	while ((res = regEx.exec(string))) indice.push(res.index);
	return indice;
}