chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message) {
	// Return early if this message isn't meant for the offscreen document.
	if (message.target !== 'offscreen-doc') {
		return;
	}

	// Dispatch the message to an appropriate handler.
	switch (message.type) {
		case 'read-data-from-clipboard':
			handleClipboardRead(message.data);
			break;
		default:
			console.warn(`Unexpected message type received: '${message.type}'.`);
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
async function handleClipboardRead(pollingRate = 1000) {
	try {
		if (typeof pollingRate !== 'number') {
			throw new TypeError(`Value provided must be a 'string', got '${typeof pollingRate}'.`);
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
				type: 'send-text-over',
				data: textEl.value
			});
		}, pollingRate);
	} finally {
		// Job's done! Close the offscreen document.
		// window.close();
	}
}
