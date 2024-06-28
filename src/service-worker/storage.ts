import type { Options } from '$lib/types';
let allowedTabId: number | null = null;

export async function getAllowedTabId() {
	let tabId = allowedTabId;
	if (tabId) {
		return tabId;
	}

	try {
		// need to fetch from storage in case the sw goes inactive (30 sec timeout)
		const { allowedTabId } = await chrome.storage.local.get('allowedTabId');
		tabId = allowedTabId;
	} catch (error) {
		console.error(error);
	}

	return tabId;
}

export async function setAllowedTabId(tabId: number | null) {
	try {
		allowedTabId = tabId;
		await chrome.storage.local.set({ allowedTabId });
	} catch (error) {
		console.error(error);
	}
}

export async function getOptions(): Promise<Options | Record<string, never>> {
	try {
		const { options } = await chrome.storage.local.get('options');
		return (options as Options) || {};
	} catch (error) {
		console.error(error);
		return {};
	}
}
