const dirArr = __dirname.split('\\');
const root = dirArr.splice(0, dirArr.length - 3).join('\\');

function ParseSyntaxError(error: SyntaxError, map: Map<string, string[][]>)
{
	let acc: string[] = [];
	let stack: string[] = [];
	const out: string[] = [];
	// Parse all new lines chars
	stack = error.stack.split('\n');
	// Parse tab chars
	stack.forEach((e: string) => acc = acc.concat(e.split('\t')));

	acc.forEach(a => {
		if (!a.trim() || a.trim() === a.match(/\^+/g)[0]) return;
		out.push(a.trim());
	});

	const processedOut = out.join('\n');
	const err = processedOut.slice(processedOut.indexOf('SyntaxError'), processedOut.indexOf('\n', processedOut.indexOf('SyntaxError')));
	const errorType = err.split(':')[0];
	const errorMessage = err.split(':')[1].trim();

	let location: string = out[0].slice(root.length + 1, out[0].length);
	const line = location.split(':')[1];
	location = location.split(':')[0];

	if (map.has(errorType)) map.set(errorType, map.get(errorType).concat([[errorMessage, location, line]]));
	else map.set(errorType, [[errorMessage, location, line]]);
}

/** Parse errors objects.
 *
 * @param {Error} error The error.
 * @param {Map<string, [Error[]]>} map Map for iterating through prossesed ones later.
 */
export default function ParseError(error: Errors, map: Map<string, string[][]>): void
{
	if (error instanceof SyntaxError) return ParseSyntaxError(error, map);
	if (error instanceof TypeError) return null;
	if (error instanceof EvalError) return null;
	if (error instanceof ReferenceError) return null;
	if (error instanceof RangeError) return null;
	else if (error instanceof Error) return null;
}

// Problems: How are those errors constructed?
export type Errors = Error | SyntaxError | TypeError | EvalError | ReferenceError | RangeError;