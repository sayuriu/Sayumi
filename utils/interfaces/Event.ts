import { PlayerEvents } from "discord-player";
import { ClientEvents } from "discord.js";
import Sayumi from "../Client";

/* eslint-disable @typescript-eslint/no-explicit-any */
// interface Sayumi_Event
// {
// 	name: keyof ClientEvents | keyof PlayerEvents | keyof NativeEvents;
// 	once?: boolean;
// 	music?: boolean;
// 	onEmit<K extends keyof ClientEvents>(client: Sayumi, ...args: ClientEvents[K]): void;
// 	onEmit<K extends keyof PlayerEvents>(client: Sayumi, args: PlayerEvents[K]): void;
// 	onEmit<K extends keyof NativeEvents>(client: Sayumi, ...args: NativeEvents[K]): void;
// }
// interface Sayumi_Event
// {
// 	name: keyof ClientEvents | keyof PlayerEvents
// 	// | keyof NativeEvents;
// 	once?: boolean;
// 	music?: boolean;
// 	onEmit: (client: Sayumi, ...args: any[]) => void;
// }

type AllEvents = (ClientEvents & PlayerEvents);
type Sayumi_Event = {
	[T in keyof AllEvents]: {
		name: T,
		once?: boolean;
		music?: boolean;
		onEmit: (client: Sayumi, ...args: AllEvents[T]) => void;
	};
}[keyof AllEvents]

export default Sayumi_Event;

// Expansion
interface NativeEvents
{
	[key: string]: [...args: any[]];
}