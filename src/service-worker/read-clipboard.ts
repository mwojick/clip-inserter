// Solution 1 - As of Jan 2023, service workers cannot directly interact with
// the system clipboard using either `navigator.clipboard` or
// `document.execCommand()`. To work around this, we'll create an offscreen
// document and delegate reading the clipboard to it.
export async function readFromClipboard(pollingRate: number) {
	await setupOffscreenDocument('src/offscreen/index.html');

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
			justification: 'Read text from the clipboard.'
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
