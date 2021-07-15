import Sayumi from "../../utils/Client";
import Sayumi_Command from "../../utils/interfaces/Command";
import { ExtMessage } from "../../utils/interfaces/extended/ExtMessage";
import Loader from '../../utils/Loader';

const cmd: Sayumi_Command = {
	name: 'reload',
	unstable: true,
	master_explicit: true,
	onTrigger: (client: Sayumi, message: ExtMessage): void => {
		client.Log.Inform('[Sayumi:Commands] Commencing full reload...');
		new Loader(client, [client.cmdDir, 'cmd']);
		new Loader(client, [client.evtDir, 'evt']);
	},
};

export = cmd;