type Request = {
	data: string;
	type: string;
	target: string;
};

let currentTabId: number | null = null;
let previousText = '';

chrome.runtime.onMessage.addListener(function handleMessage({ target, type, data }: Request) {
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
});

function setupMessage() {
	chrome.runtime.onMessage.addListener(function handleMessage({ target, type, data }: Request) {
		if (target !== 'content-script') {
			return;
		}

		if (type === 'insert') {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = data;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (type === 'remove') {
			chrome.runtime.onMessage.removeListener(handleMessage);
		}
	});
}

chrome.tabs.onUpdated.addListener(async (number, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.url === 'http://localhost:5174/') {
		console.log('number:', number);
		console.log('tab:', tab);

		if (tab.id) {
			currentTabId = tab.id;
			await chrome.scripting
				.executeScript({ target: { tabId: tab.id }, func: setupMessage })
				.catch((error) => console.error(`Error executing the content script: ${error}`));

			await readFromClipboard(1000);

			chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: 'green' });
			chrome.action.setBadgeText({
				tabId: tab.id,
				text: 'ON'
			});
		}
	}
});

// Solution 1 - As of Jan 2023, service workers cannot directly interact with
// the system clipboard using either `navigator.clipboard` or
// `document.execCommand()`. To work around this, we'll create an offscreen
// document and delegate reading the clipboard to it.
async function readFromClipboard(pollingRate: number) {
	// await chrome.offscreen.createDocument({
	// 	url: 'offscreen.html',
	// 	reasons: [chrome.offscreen.Reason.CLIPBOARD],
	// 	justification: 'Write text to the clipboard.'
	// });

	await setupOffscreenDocument('offscreen.html');

	// Now that we have an offscreen document, we can dispatch the message.
	chrome.runtime.sendMessage({
		target: 'offscreen-doc',
		type: 'read-data-from-clipboard',
		data: pollingRate
	});
}

// A global promise to avoid concurrency issues
let creating: Promise<void> | null;
async function setupOffscreenDocument(path: string) {
	// Check all windows controlled by the service worker to see if one
	// of them is the offscreen document with the given path
	const offscreenUrl = chrome.runtime.getURL(path);
	const existingContexts = await chrome.runtime.getContexts({
		contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
		documentUrls: [offscreenUrl]
	});

	if (existingContexts.length > 0) {
		return;
	}

	// create offscreen document
	if (creating) {
		await creating;
	} else {
		creating = chrome.offscreen.createDocument({
			url: path,
			reasons: [chrome.offscreen.Reason.CLIPBOARD],
			justification: 'Write text to the clipboard.'
		});
		await creating;
		creating = null;
	}
}

// Solution 2 – Once extension service workers can use the Clipboard API,
// replace the offscreen document based implementation with something like this.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function readFromClipboardV2() {
	navigator.clipboard.readText().then((text) => text);
}
