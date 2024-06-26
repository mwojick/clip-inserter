import type { Request } from '$lib/types';
import { TARGET, TYPE } from '$lib/constants';
import { readFromClipboard } from './read-clipboard';

let currentTabId: number | null = null;

chrome.runtime.onMessage.addListener(handleOffscreenMessage);

async function handleOffscreenMessage({ target, type, data }: Request<string>) {
	if (target !== TARGET.SERVICE_WORKER) {
		return;
	}

	if (type === TYPE.CLIPBOARD_TEXT && currentTabId) {
		try {
			await chrome.tabs.sendMessage(currentTabId, {
				target: TARGET.CONTENT_SCRIPT,
				type: TYPE.INSERT,
				data
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		console.warn(`Unexpected message type received: '${type}'.`);
	}
}

// this runs within the context of the page
async function setupContentMessage(TARG: typeof TARGET, TYP: typeof TYPE) {
	try {
		await navigator.clipboard.writeText('');
	} catch (error) {
		console.error(error);
	}

	chrome.runtime.onMessage.addListener(handleWorkerMessage);

	function handleWorkerMessage({ target, type, data }: Request<string>) {
		if (target !== TARG.CONTENT_SCRIPT) {
			return;
		}

		if (type === TYP.INSERT) {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = data;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (type === TYP.REMOVE) {
			chrome.runtime.onMessage.removeListener(handleWorkerMessage);
		} else {
			console.warn(`Unexpected message type received: '${type}'.`);
		}
	}
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.active && tab.url === 'http://localhost:5174/') {
		if (currentTabId !== tabId) {
			// clean up old tab when creating a new tab with same url
			if (currentTabId) {
				try {
					await Promise.all([
						chrome.tabs.sendMessage(currentTabId, {
							target: TARGET.CONTENT_SCRIPT,
							type: TYPE.REMOVE
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

			currentTabId = tabId;

			try {
				await chrome.scripting.executeScript({
					target: { tabId },
					func: setupContentMessage,
					args: [TARGET, TYPE]
				});
				await readFromClipboard(500);
				await Promise.all([
					chrome.action.setBadgeBackgroundColor({ tabId, color: '#98a6f7' }),
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

chrome.webNavigation.onBeforeNavigate.addListener(async ({ tabId, url }) => {
	// clean up tab when navigating away or refreshing
	if (currentTabId === tabId) {
		try {
			const promises = [
				chrome.tabs.sendMessage(currentTabId, {
					target: TARGET.CONTENT_SCRIPT,
					type: TYPE.REMOVE
				}),
				chrome.action.setBadgeText({
					tabId: currentTabId,
					text: ''
				})
			];
			if (url !== 'http://localhost:5174/') {
				promises.push(chrome.offscreen.closeDocument());
			}
			await Promise.all(promises);

			currentTabId = null;
		} catch (error) {
			console.error(error);
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
