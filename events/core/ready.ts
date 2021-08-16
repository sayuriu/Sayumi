/* eslint-disable import/no-named-as-default */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Sayumi from '../../utils/Client';
import Sayumi_Event from '../../utils/interfaces/Event';
import InternalClock from '../../utils/InternalClock';
import { statuses } from '../../utils/json/Responses.json';

const evt: Sayumi_Event = {
	name: 'ready',
	once: true,
	onEmit: (client: Sayumi): void => {
		client.Log('connected', client.Methods.Common.Greetings());
		setInterval(() => {
			try {
				client.user.setActivity(client.Methods.Common.GetRandomize(statuses), { type: 'WATCHING' });
			} catch (error: any) {
				return client.RaiseException(`[Discord > ClientPresence] \n${error.message}`, 'WARN');
			}
		}, 900000);
		setTimeout(() => {
			global.TerminalClock = setInterval(InternalClock, 34);
			process.stdout.on('resize', () => {
				clearInterval(global.TerminalClock);
				global.TerminalClock = setInterval(InternalClock, 1000);
			});
			process.on('SIGWINCH', () => console.log('c'));
		}, 1000);
	},
};

export = evt;