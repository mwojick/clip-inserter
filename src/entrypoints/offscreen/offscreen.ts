import type { Request } from '$lib/types';
import { TARGET, TYPE } from '$lib/constants';

browser.runtime.onMessage.addListener(handleWorkerMessage);

function handleWorkerMessage({
	target,
	type,
	data
}: Request<{ pollingRate: number; clearPrevText: boolean }>) {
	// Return early if this message isn't meant for the offscreen document.
	if (target !== TARGET.OFFSCREEN_DOC) {
		return;
	}

	if (type === TYPE.READ_DATA_FROM_CLIPBOARD) {
		handleClipboardRead(data.pollingRate, data.clearPrevText);
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
let previousText = '';

// Use the offscreen document's `document` interface to read from
// the system clipboard.
//
// The `navigator.clipboard` API requires that the window is focused,
// but offscreen documents cannot be focused.
// As such, we have to fall back to `document.execCommand()`.
function handleClipboardRead(pollingRate: number, clearPrevText: boolean) {
	if (typeof pollingRate !== 'number') {
		throw new TypeError(`Value provided must be a 'number', got '${typeof pollingRate}'.`);
	}

	if (clearPrevText) {
		previousText = '';
	}
	if (interval) {
		clearInterval(interval);
	}

	interval = setInterval(() => {
		textEl.value = '';
		textEl.select();
		document.execCommand('paste');
		const newText = textEl.value.trim();

		if (newText && newText !== previousText) {
			previousText = newText;
			browser.runtime.sendMessage({
				target: TARGET.SERVICE_WORKER,
				type: TYPE.CLIPBOARD_TEXT,
				data: newText
			});
		}
	}, pollingRate);
}
