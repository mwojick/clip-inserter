import type { Request } from '$lib/types';
import { TARGET, TYPE } from '$lib/constants';
import { readFromClipboard } from './read-clipboard';
import { getCurrentTabId, setCurrentTabId } from './storage';

chrome.runtime.onMessage.addListener(handleOffscreenMessage);

async function handleOffscreenMessage({ target, type, data }: Request<string>) {
	if (target !== TARGET.SERVICE_WORKER) {
		return;
	}
	if (type !== TYPE.CLIPBOARD_TEXT) {
		console.warn(`Unexpected message type received: '${type}'.`);
		return;
	}
	const curTabId = await getCurrentTabId();
	if (curTabId) {
		try {
			await chrome.tabs.sendMessage(curTabId, {
				target: TARGET.CONTENT_SCRIPT,
				type: TYPE.INSERT_TEXT,
				data
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		console.error('No currentTabId found.');
	}
}

// this runs within the context of the page
async function setupContentMessage(TARG: typeof TARGET, TYP: typeof TYPE) {
	try {
		await navigator.clipboard.writeText('');
	} catch (error) {
		console.warn(error);
	}

	chrome.runtime.onMessage.addListener(handleWorkerMessage);

	function handleWorkerMessage({ target, type, data }: Request<string>) {
		if (target !== TARG.CONTENT_SCRIPT) {
			return;
		}

		if (type === TYP.INSERT_TEXT) {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = data;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (type === TYP.REMOVE_LISTENER) {
			chrome.runtime.onMessage.removeListener(handleWorkerMessage);
		} else {
			console.warn(`Unexpected message type received: '${type}'.`);
		}
	}
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.active && tab.url === 'http://localhost:5174/') {
		const curTabId = await getCurrentTabId();
		if (curTabId !== tabId) {
			// clean up old tab when creating a new tab with same url
			if (curTabId) {
				try {
					await Promise.all([
						chrome.tabs.sendMessage(curTabId, {
							target: TARGET.CONTENT_SCRIPT,
							type: TYPE.REMOVE_LISTENER
						}),
						chrome.action.setBadgeText({
							tabId: curTabId,
							text: ''
						})
					]);
				} catch (error) {
					console.warn(error);
				}
			}

			await setCurrentTabId(tabId);

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
	const curTabId = await getCurrentTabId();
	if (curTabId === tabId) {
		try {
			const promises = [
				chrome.tabs.sendMessage(curTabId, {
					target: TARGET.CONTENT_SCRIPT,
					type: TYPE.REMOVE_LISTENER
				}),
				chrome.action.setBadgeText({
					tabId: curTabId,
					text: ''
				})
			];
			if (url !== 'http://localhost:5174/') {
				promises.push(chrome.offscreen.closeDocument());
			}
			await Promise.all(promises);
		} catch (error) {
			console.warn(error);
		}
		await setCurrentTabId(null).catch((e) => console.error(e));
	}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
	const curTabId = await getCurrentTabId();
	if (curTabId === tabId) {
		try {
			await chrome.offscreen.closeDocument();
		} catch (error) {
			console.warn(error);
		}
		await setCurrentTabId(null).catch((e) => console.error(e));
	}
});
