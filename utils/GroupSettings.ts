import Sayumi_MsgCommandStruct from '@interfaces/Command';

export type GroupSettings = {
	[groupName: string]:
	{
		global: Partial<Sayumi_MsgCommandStruct>
		groups: {
			[key
				in keyof Sayumi_MsgCommandStruct
				as Exclude<
							key,
							Sayumi_MsgCommandStruct[key] extends boolean ?
								never : key
						>
			]?: string[];
		}
	}
}

/** These settings will affect all commands within that given group.
 * Note that it must be a valid group. Check `json/Categories` for more info.
*/
const settings: GroupSettings = {
	Music: {
		global: {
			guildOnly: true,
		},
		groups: {
			args: ['effects', 'loop', 'mplay', 'queue', 'mskip', 'volume'],
			reqArgs: ['skipto', 'moveto', 'msearch', 'remove', 'seek'],
		},
	},
};

export default settings;