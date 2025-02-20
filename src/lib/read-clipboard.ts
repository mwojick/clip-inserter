import { TARGET, TYPE, INIT_RATE } from '$lib/constants';
import type { PublicPath } from 'wxt/browser';
import { getAllowedTabId } from '$lib/storage';

export async function setupClipboardReader({
	pollingRate = INIT_RATE,
	clearPrevText = true
}: {
	pollingRate: number;
	clearPrevText?: boolean;
}) {
	if (import.meta.env.CHROME) {
		// As of Jan 2023, service workers cannot directly interact with
		// the system clipboard using either `navigator.clipboard` or
		// `document.execCommand()`. To work around this, we'll create an offscreen
		// document and delegate reading the clipboard to it.
		await setupOffscreenDocument('/offscreen.html' as PublicPath);

		// Now that we have an offscreen document, we can dispatch the message.
		browser.runtime.sendMessage({
			target: TARGET.OFFSCREEN_DOC,
			type: TYPE.READ_DATA_FROM_CLIPBOARD,
			data: { pollingRate, clearPrevText }
		});
	} else {
		pollForClipboard(pollingRate, clearPrevText);
	}
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

let interval: NodeJS.Timeout | null = null;
let previousText = '';
function pollForClipboard(pollingRate: number, clearPrevText: boolean) {
	if (interval) {
		clearInterval(interval);
	}

	if (clearPrevText) {
		previousText = '';
		navigator.clipboard.writeText('').catch((error) => {
			console.warn(error);
		});
	}

	interval = setInterval(() => {
		navigator.clipboard.readText().then((newText) => {
			newText = newText.trim();
			if (newText && newText !== previousText) {
				previousText = newText;
				sendTextToPage(newText);
			}
		});
	}, pollingRate);
}

export function disableClipboardPoll() {
	previousText = '';

	if (interval) {
		clearInterval(interval);
		interval = null;
	}
}

export async function sendTextToPage(text: string) {
	const allowedTabId = await getAllowedTabId();
	if (allowedTabId) {
		try {
			await browser.tabs.sendMessage(allowedTabId, {
				target: TARGET.CONTENT_SCRIPT,
				type: TYPE.INSERT_TEXT,
				data: text
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		console.error('No allowedTabId found.');
	}
}
