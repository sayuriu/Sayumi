import EvalInstance from "../../utils/Eval";
import Sayumi_Command from "../../utils/interfaces/Command";

const cmd: Sayumi_Command =
{
	name: 'eval',
	description: 'The most powerful thing you can get out of me.',
	groups: ['Utilities'],
	terminal: true,
	master_explicit: true,
	onTrigger: (client, message) =>
	{
		const sessionID = EvalInstance.getSessionsID(message.author.id, message.channel.id);
		client.EvalSessions.set(
			sessionID,
			new EvalInstance(message, {
				ReactionFilter: (reaction, user) => ['👍', '✋'].includes(reaction.emoji.name) && user.id === message.author.id,
				UserFilter: user => user.id === message.author.id,
			}),
		);

		try
		{
			client.EvalSessions.get(sessionID).start(message);
		}
		catch (_)
		{
			void message.channel.send('Something wrong happened within this eval session. Commencing termination.');
			client.EvalSessions.get(sessionID).destroy();
		}
	},
};

export = cmd;