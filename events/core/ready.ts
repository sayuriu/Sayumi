/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Sayumi from '../../utils/Client';
import { statuses } from '../../utils/json/Responses.json';

export const evt = {
	name: 'ready',
	once: true,
	onEmit: (client: Sayumi): void => {
		client.Log('connected', client.Methods.Common.Greetings());
		setInterval(() => {
			try {
				client.user.setActivity(client.Methods.Common.GetRandomize(statuses), { type: 'WATCHING' });
			} catch (error: any) {
				return client.Log.error(`[Discord > ClientPresence] \n${error.message}`);
			}
		}, 900000);
	},
};