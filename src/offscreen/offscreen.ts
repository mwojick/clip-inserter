import type { Request } from '$lib/types';

chrome.runtime.onMessage.addListener(handleWorkerMessage);

function handleWorkerMessage({ target, type, data }: Request<number>) {
	// Return early if this message isn't meant for the offscreen document.
	if (target !== 'offscreen-doc') {
		return;
	}

	if (type === 'read-data-from-clipboard') {
		handleClipboardRead(data);
	} else {
		console.warn(`Unexpected message type received: '${type}'.`);
	}
}

// We use a <textarea> element for two main reasons:
//  1. preserve the formatting of multiline text,
//  2. select the node's content using this element's `.select()` method.
const textEl = document.querySelector('#text') as HTMLTextAreaElement;

// Prevent non-text from being pasted
textEl.addEventListener('paste', (e: ClipboardEvent) => {
	if (e.clipboardData?.getData('text/plain') === '') {
		e.preventDefault();
	}
});

let interval: NodeJS.Timeout | null = null;

// Use the offscreen document's `document` interface to write a new value to the
// system clipboard.
//
// The `navigator.clipboard` API requires that the window is focused,
// but offscreen documents cannot be focused.
// As such, we have to fall back to `document.execCommand()`.
function handleClipboardRead(pollingRate = 1000) {
	if (typeof pollingRate !== 'number') {
		throw new TypeError(`Value provided must be a 'number', got '${typeof pollingRate}'.`);
	}

	if (interval) {
		clearInterval(interval);
	}

	interval = setInterval(() => {
		textEl.value = '';
		textEl.select();
		document.execCommand('paste');

		chrome.runtime.sendMessage({
			target: 'service-worker',
			type: 'clipboard-text',
			data: textEl.value.trim()
		});
	}, pollingRate);
}
