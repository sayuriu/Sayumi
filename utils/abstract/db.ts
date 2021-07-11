export abstract class Database
{
	private retries: number;
	constructor(data: DatabaseInitOption)
	{
		this.retries = -1;
		this.Connect();
	}
	[key: string]: unknown;
	private Connect: () => void;
	private HandleConnection: () => void;
	private RetryConnection: () => void;
	private onRefusedConnection: (fail?: boolean) => void;
}

/** Works with MongoDB. */
export interface DatabaseInitOption
{
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

export default Database;