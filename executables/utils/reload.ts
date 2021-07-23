import Sayumi_Command from "../../utils/interfaces/Command";
import Loader from '../../utils/Loader';

const cmd: Sayumi_Command = {
	name: 'reload',
	unstable: true,
	master_explicit: true,
	cooldown: 60,
	onTrigger: (client, message): void => {
		client.Log.Inform('[Sayumi:Commands] Commencing full reload...');
		new Loader(client, [client.cmdDir, 'cmd']);
		new Loader(client, [client.evtDir, 'evt']);
	},
};

export = cmd;