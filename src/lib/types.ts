export type Request<T> = {
	data: T;
	type: string;
	target: string;
};

export type Options = {
	popupTabId: number | null;
	allowedURL: string;
	pollingRate: number;
	element: string;
	selector: string;
	changingRate: boolean;
	changingEls: boolean;
};
