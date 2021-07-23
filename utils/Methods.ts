// #region Common
import ArrayDupCheck from './methods/common/array-dupcheck';
import PermissionCheck from './methods/common/perms-check';
import ShiftElementToLast from './methods/common/array-shift-to-last';
import DurstenfeldShuffler from './methods/common/array-shuffler';
import DelayTask from './methods/common/delay-task';
import EscapeRegex from './methods/common/escape-regexp';
import GeneratePages from './methods/common/generate-pages';
import Greetings from './methods/common/greetings';
import HSLtoRGB from './methods/common/hsl-to-rgb';
import ParseError from './methods/common/parse-errors';
import GetRandomize from './methods/common/randomize';
import RandomHex8Str from './methods/common/ranhex8';
import StringLimiter from './methods/common/string-limiter';
import SearchString from './methods/common/string-search';
// #endregion

// #region Time
import FormatTime from './methods/time/format-time';
import GetTime from './methods/time/get-time';
import ParseTimeCode from './methods/time/parse-time-code';
import TimestampToTime from './methods/time/timestamp-to-time';
// #endregion

// #region DirSet
import GetTotalSize from './methods/data/get-total-size';
import ConvertBytes from './methods/data/convert-bytes';
// #endregion

const Methods = {
	Common: {
		ArrayDupCheck,
		DurstenfeldShuffler,
		DelayTask,
		EscapeRegex,
		GetRandomize,
		GeneratePages,
		Greetings,
		HSLtoRGB,
		ParseError,
		PermissionCheck,
		RandomHex8Str,
		SearchString,
		ShiftElementToLast,
		StringLimiter,
	},
	Time: {
		FormatTime,
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