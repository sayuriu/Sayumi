/** Returns a file / folder's size.
 * @param {number} bytes
 */
export default function(bytes: number): string
{
	const sizes = ["Bytes", "kB", "MB", "GB", "TB"];

	if (bytes == 0) return "n/a";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	if (!i) return `${bytes} ${sizes[i]}`;

	return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}