import type { Request } from '$lib/types';
import { readFromClipboard } from './read-clipboard';

let currentTabId: number | null = null;
let previousText = '';

chrome.runtime.onMessage.addListener(handleOffscreenMessage);

async function handleOffscreenMessage({ target, type, data }: Request<string>) {
	if (target !== 'service-worker') {
		return;
	}

	if (type === 'clipboard-text') {
		console.log('CONTENT:', data);

		if (currentTabId && data && data !== previousText) {
			previousText = data;
			try {
				await chrome.tabs.sendMessage(currentTabId, {
					target: 'content-script',
					type: 'insert',
					data
				});
			} catch (error) {
				console.error(error);
			}
		}
	} else {
		console.warn(`Unexpected message type received: '${type}'.`);
	}
}

// this runs within the context of the page
async function setupContentMessage() {
	try {
		await navigator.clipboard.writeText('');
	} catch (error) {
		console.error(error);
	}

	chrome.runtime.onMessage.addListener(handleWorkerMessage);

	function handleWorkerMessage({ target, type, data }: Request<string>) {
		if (target !== 'content-script') {
			return;
		}

		if (type === 'insert') {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = data;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (type === 'remove') {
			chrome.runtime.onMessage.removeListener(handleWorkerMessage);
		} else {
			console.warn(`Unexpected message type received: '${type}'.`);
		}
	}
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.active && tab.url === 'http://localhost:5174/') {
		if (currentTabId !== tabId) {
			// clean up old tab when refreshing on a new tab with same url
			if (currentTabId) {
				try {
					await Promise.all([
						chrome.tabs.sendMessage(currentTabId, {
							target: 'content-script',
							type: 'remove'
						}),
						chrome.action.setBadgeText({
							tabId: currentTabId,
							text: ''
						})
					]);
				} catch (error) {
					console.error(error);
				}
			}

			previousText = '';
			currentTabId = tabId;

			try {
				await Promise.all([
					chrome.scripting.executeScript({ target: { tabId }, func: setupContentMessage }),
					readFromClipboard(500)
				]);
				await Promise.all([
					chrome.action.setBadgeBackgroundColor({ tabId, color: 'green' }),
					chrome.action.setBadgeText({
						tabId,
						text: 'ON'
					})
				]);
			} catch (error) {
				console.error(error);
			}
		}
	}
});

chrome.webNavigation.onBeforeNavigate.addListener(async ({ tabId }) => {
	// clean up tab when navigating away
	if (currentTabId === tabId) {
		try {
			await Promise.all([
				chrome.tabs.sendMessage(currentTabId, {
					target: 'content-script',
					type: 'remove'
				}),
				chrome.offscreen.closeDocument(),
				chrome.action.setBadgeText({
					tabId: currentTabId,
					text: ''
				})
			]);

			currentTabId = null;
		} catch (error) {
			console.log(error);
		}
	}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
	if (currentTabId === tabId) {
		try {
			await chrome.offscreen.closeDocument();
			currentTabId = null;
		} catch (error) {
			console.error(error);
		}
	}
});
