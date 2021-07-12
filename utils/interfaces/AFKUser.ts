interface AFKUser
{
	name: string;
	id: string;
	reason: string;
	AFKTimestamp: number;
	lastChannel: string;
}

export default AFKUser;