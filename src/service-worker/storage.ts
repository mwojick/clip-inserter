let currentTabId: number | null = null;

export async function getCurrentTabId() {
	let tabId = currentTabId;
	if (tabId) {
		return tabId;
	}

	try {
		// need to fetch from storage in case the sw goes inactive (30 sec timeout)
		const { currentTabId } = await chrome.storage.local.get('currentTabId');
		tabId = currentTabId;
	} catch (error) {
		console.error(error);
	}

	return tabId;
}

export async function setCurrentTabId(tabId: number | null) {
	try {
		currentTabId = tabId;
		await chrome.storage.local.set({ currentTabId });
	} catch (error) {
		console.error(error);
	}
}
