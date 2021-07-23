/* Shifts a specified element in an array to the lst index.*/
export default function shiftElementToLast<T>(array: T[], callback: (value: T, index: number, obj: T[]) => unknown): void
{
	array.push(array.splice(array.findIndex(callback), 1)[0]);
}
