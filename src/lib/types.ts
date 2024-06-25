export type Request<T> = {
	data: T;
	type: string;
	target: string;
};
