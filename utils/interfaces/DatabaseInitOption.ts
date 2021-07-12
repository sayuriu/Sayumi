export interface DatabaseInitOption
{
	/** URI for the main connection. */
	uri: string;
	/** Fallback URI in case of a remote database issue. */
	localUri?: string;
	/** Auth username if you are using a remote MongoDB database.
	 * Not required if you are connecting to `localhost`.
	 */
	username?: string;
	/**	Auth password if you are using a remote MongoDB database.
	 * Not required if you are connecting to `localhost`.
	 */
	password?: string;
	/** Specifies if this uses local host. */
	local: boolean;
}