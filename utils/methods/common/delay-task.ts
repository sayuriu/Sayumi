/** Only works with synchronous operations. */
export default function(duration: number): void
{
	if (!duration) return;
	const timestamp = Date.now();
	while(Date.now() - timestamp < duration);
}