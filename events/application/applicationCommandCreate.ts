import Sayumi_Event from "../../utils/interfaces/Event";

const evt: Sayumi_Event = {
	name: 'applicationCommandCreate',
	onEmit: (client, cmd) => {
		console.log(cmd);
	},
};

export = evt;