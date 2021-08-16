**[num]** *[requester]*

> [track name w/ link]() | [duration]

-> Track: inherit TrackData
data				type

author  	  	  - string
description 	- string
duration	 	- number
durationMS  - number
fromPlaylist - bool
player       	- this > Player
queue			- this > Queue
raw				 ->  TrackData       [i]
requestedBy - Discord > user
thumbnail     - string:url
title			- string
url				- string:url
views			- number

-> TrackData

engine - string | Readable
source -> TrackSource [sc, yt, ab]
live: bool

