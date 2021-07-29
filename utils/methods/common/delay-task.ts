/** Delays the current task for specified amount of time. */
export default function(duration: number): void
{
	if (!duration) return;
	const timestamp = Date.now();
	while(Date.now() - timestamp < duration);
}