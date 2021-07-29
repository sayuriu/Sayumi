import Common from './methods/common/exports';
import Colors from './methods/colors/exports';
import Time from './methods/time/exports';
import Data from './methods/data/exports';

export default {
	Common,
	Colors,
	Data,
	Time,
	Task : {
		DelayTask: Common.DelayTask,
		Halt: Common.DelayTask,
	},
};

