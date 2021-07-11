import { PlayerEvents } from "discord-player";
import { ClientEvents } from "discord.js";
import Sayumi from "../Client";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Sayumi_Event
{
	name: string & keyof ClientEvents & keyof PlayerEvents
	once?: boolean;
	music?: boolean;
	onEmit: (client: Sayumi, ...args: any[]) => void;
}

export default Sayumi_Event;