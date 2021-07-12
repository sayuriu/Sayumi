// #region Common
import ArrayDupCheck from './functions/common/array-dupcheck';
import ShiftElementToLast from './functions/common/array-shift-to-last';
import DurstenfeldShuffler from './functions/common/array-shuffler';
import DelayTask from './functions/common/delay-task';
import EscapeRegex from './functions/common/escape-regexp';
import Greetings from './functions/common/greetings';
import HSLtoRGB from './functions/common/hsl-to-rgb';
import ParseError from './functions/common/parse-errors';
import GetRandomize from './functions/common/randomize';
import RandomHex8Str from './functions/common/ranhex8';
import StringLimiter from './functions/common/string-limiter';
import SearchString from './functions/common/string-search';
// #endregion

// #region Time
import GetTime from './functions/time/get-time';
import ParseTimeCode from './functions/time/parse-time-code';
import TimestampToTime from './functions/time/timestamp-to-time';
// #endregion

// #region DirSet
import GetTotalSize from './functions/data/get-total-size';
import ConvertBytes from './functions/data/convert-bytes';
// #endregion

const Methods = {
	Common: {
		ArrayDupCheck,
		ShiftElementToLast,
		DurstenfeldShuffler,
		DelayTask,
		EscapeRegex,
		Greetings,
		HSLtoRGB,
		ParseError,
		GetRandomize,
		RandomHex8Str,
		StringLimiter,
		SearchString,
	},
	Time: {
		GetTime,
		ParseTimeCode,
		TimestampToTime,
	},
	Data: {
		ConvertBytes,
		GetTotalSize,
	},
};

export default Methods;