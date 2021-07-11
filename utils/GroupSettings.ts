/** These settings will  affect all commands within that given group.
 * Note that it must be a valid group. Check `json/Categories` for more info.
*/

export default {
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