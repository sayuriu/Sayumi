/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MessageReaction, User } from 'discord.js';
import Sayumi from '../../utils/Client';
import { ExtMessage } from '../../utils/interfaces/extended/ExtMessage';
import Sayumi_Command from '../../utils/interfaces/Command';
import EvalRenderer from '../../utils/Eval';

/** This command is incompatible with Message#MessageInteractions.
 */
const cmd: Sayumi_Command = {
	name: 'eval',
	description: 'Execute literally anything, directly through the command line. \nSounds scary.',
	cooldown: 0,
	args: true,
	groups: ['Utilities'],
	terminal: true,
	master_explicit: true,
	usage: ['[flags] <input>'],
	usageSyntax: ['[flags: ]'],
	onTrigger: (client: Sayumi, message: ExtMessage, prefix: string): void => {
		const sessionID = EvalRenderer.getSessionsID(message.author, message.channel);

		const initData = Object.assign(message, {
			ReactionFilter: (reaction: MessageReaction, user: User) => ['👍', '✋'].includes(reaction.emoji.name) && user.id === message.author.id,
			UserFilter: (user: User) => user.id === message.author.id,
			sessionID: sessionID,
			prefix: prefix,
		});

		client.EvalSessions.set(sessionID, new EvalRenderer(initData));
		client.EvalSessions.get(sessionID).start();
	},
};

export = cmd;