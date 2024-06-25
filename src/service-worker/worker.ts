import type { Request } from '$lib/types';
import { readFromClipboard } from './read-clipboard';

let currentTabId: number | null = null;
let previousText = '';

chrome.runtime.onMessage.addListener(handleOffscreenMessage);

function handleOffscreenMessage({ target, type, data }: Request<string>) {
	if (target !== 'service-worker') {
		return;
	}

	switch (type) {
		case 'send-text-over':
			console.log('CONTENT:', data);

			if (currentTabId && data && data !== previousText) {
				chrome.tabs.sendMessage(currentTabId, {
					target: 'content-script',
					type: 'insert',
					data
				});
				previousText = data;
			}
			break;
		default:
			console.warn(`Unexpected message type received: '${type}'.`);
	}
}

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
		}
	}
}

chrome.tabs.onUpdated.addListener(async (number, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.url === 'http://localhost:5174/') {
		console.log('number:', number);

		if (tab.id) {
			currentTabId = tab.id;
			previousText = '';
			await chrome.scripting
				.executeScript({ target: { tabId: tab.id }, func: setupContentMessage })
				.catch((error) => console.error(`Error executing the content script: ${error}`));

			await readFromClipboard(500);

			chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: 'green' });
			chrome.action.setBadgeText({
				tabId: tab.id,
				text: 'ON'
			});
		}
	}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
	if (tabId === currentTabId) {
		try {
			await chrome.offscreen.closeDocument();
			currentTabId = null;
		} catch (error) {
			console.error(error);
		}
	}
});
