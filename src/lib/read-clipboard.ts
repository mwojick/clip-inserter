import { TARGET, TYPE, INIT_RATE } from '$lib/constants';
import type { PublicPath } from 'wxt/browser';

// Solution 1 - As of Jan 2023, service workers cannot directly interact with
// the system clipboard using either `navigator.clipboard` or
// `document.execCommand()`. To work around this, we'll create an offscreen
// document and delegate reading the clipboard to it.
export async function readFromClipboard({
	pollingRate = INIT_RATE,
	clearPrevText = true
}: {
	pollingRate: number;
	clearPrevText?: boolean;
}) {
	await setupOffscreenDocument('/offscreen.html');

	// Now that we have an offscreen document, we can dispatch the message.
	browser.runtime.sendMessage({
		target: TARGET.OFFSCREEN_DOC,
		type: TYPE.READ_DATA_FROM_CLIPBOARD,
		data: { pollingRate, clearPrevText }
	});
}

// A global promise to avoid concurrency issues
let creating: Promise<void> | null;
async function setupOffscreenDocument(path: PublicPath) {
	// Check all windows controlled by the service worker to see if one
	// of them is the offscreen document with the given path
	const offscreenUrl = browser.runtime.getURL(path);
	const existingContexts = await browser.runtime.getContexts({
		contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
		documentUrls: [offscreenUrl]
	});

	if (existingContexts.length > 0) {
		return;
	}

	// create offscreen document
	if (creating) {
		await creating;
	} else {
		creating = browser.offscreen.createDocument({
			url: path,
			reasons: [browser.offscreen.Reason.CLIPBOARD],
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
