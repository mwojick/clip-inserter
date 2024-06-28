export type Request<T> = {
	data: T;
	type: string;
	target: string;
};

export type Options = {
	popupTabId: number | null;
	allowedURL: string;
	pollingInterval: number;
	changingInterval: boolean;
};
