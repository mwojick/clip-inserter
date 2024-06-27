import type { Request } from '$lib/types';
import { TARGET, TYPE } from '$lib/constants';
import { readFromClipboard } from './read-clipboard';
import { getAllowedTabId, setAllowedTabId, getOptions } from './storage';

chrome.runtime.onMessage.addListener(handleOffscreenMessage);

async function handleOffscreenMessage({ target, type, data }: Request<string>) {
	if (target !== TARGET.SERVICE_WORKER) {
		return;
	}
	if (type !== TYPE.CLIPBOARD_TEXT) {
		console.warn(`Unexpected message type received: '${type}'.`);
		return;
	}
	const allowedTabId = await getAllowedTabId();
	if (allowedTabId) {
		try {
			await chrome.tabs.sendMessage(allowedTabId, {
				target: TARGET.CONTENT_SCRIPT,
				type: TYPE.INSERT_TEXT,
				data
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		console.error('No allowedTabId found.');
	}
}

// this runs within the context of the page
async function setupContentMessage(_TARGET: typeof TARGET, _TYPE: typeof TYPE) {
	try {
		await navigator.clipboard.writeText('');
	} catch (error) {
		console.warn(error);
	}

	chrome.runtime.onMessage.addListener(handleWorkerMessage);

	function handleWorkerMessage({ target, type, data }: Request<string>) {
		if (target !== _TARGET.CONTENT_SCRIPT) {
			return;
		}

		if (type === _TYPE.INSERT_TEXT) {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = data;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (type === _TYPE.REMOVE_LISTENER) {
			chrome.runtime.onMessage.removeListener(handleWorkerMessage);
		} else {
			console.warn(`Unexpected message type received: '${type}'.`);
		}
	}
}

function tabCleanups(tabId: number) {
	return [
		chrome.tabs.sendMessage(tabId, {
			target: TARGET.CONTENT_SCRIPT,
			type: TYPE.REMOVE_LISTENER
		}),
		chrome.action.setBadgeText({
			tabId: tabId,
			text: ''
		})
	];
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.active && tab.url === 'http://localhost:5174/') {
		const allowedTabId = await getAllowedTabId();
		if (allowedTabId !== tabId) {
			// clean up old tab when creating a new tab with same url
			if (allowedTabId) {
				try {
					await Promise.all(tabCleanups(allowedTabId));
				} catch (error) {
					console.warn(error);
				}
			}

			await setAllowedTabId(tabId);

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
	const allowedTabId = await getAllowedTabId();
	if (allowedTabId === tabId) {
		const { allowedURL } = await getOptions();
		try {
			const promises = tabCleanups(allowedTabId);
			if (url !== allowedURL) {
				promises.push(chrome.offscreen.closeDocument());
			}
			await Promise.all(promises);
		} catch (error) {
			console.warn(error);
		}
		await setAllowedTabId(null).catch((e) => console.error(e));
	}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
	const allowedTabId = await getAllowedTabId();
	if (allowedTabId === tabId) {
		try {
			await chrome.offscreen.closeDocument();
		} catch (error) {
			console.warn(error);
		}
		await setAllowedTabId(null).catch((e) => console.error(e));
	}
});

// Watch for changes to the user's options & apply them
chrome.storage.onChanged.addListener((changes, area) => {
	const newOpts = changes.options?.newValue;
	if (area === 'local' && newOpts) {
		console.log('newOpts:', newOpts);
	}
});
