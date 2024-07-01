import type { Options, Request } from '$lib/types';
import { TARGET, TYPE, INIT_ELEMENT, INIT_SELECTOR } from '$lib/constants';
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
async function setupContentMessage(
	_TARGET: typeof TARGET,
	_TYPE: typeof TYPE,
	clearClipboard: boolean,
	element: string,
	selector: string
) {
	if (clearClipboard) {
		try {
			await navigator.clipboard.writeText('');
		} catch (error) {
			console.warn(error);
		}
	}

	chrome.runtime.onMessage.addListener(handleWorkerMessage);

	function handleWorkerMessage({ target, type, data }: Request<string>) {
		if (target !== _TARGET.CONTENT_SCRIPT) {
			return;
		}

		if (type === _TYPE.INSERT_TEXT) {
			const pasteTarget = document.createElement(element);
			pasteTarget.textContent = data;
			document.querySelector(selector)?.appendChild(pasteTarget);
		} else if (type === _TYPE.REMOVE_LISTENER) {
			chrome.runtime.onMessage.removeListener(handleWorkerMessage);
		} else {
			console.warn(`Unexpected message type received: '${type}'.`);
		}
	}
}

function badgeEnablers(tabId: number) {
	return [
		chrome.action.setBadgeBackgroundColor({ tabId, color: '#a4b1fc' }),
		chrome.action.setBadgeText({
			tabId,
			text: 'ON'
		})
	];
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

function closeDoc() {
	return chrome.offscreen.closeDocument();
}

async function enableClipboardReader(
	tabId: number,
	allowedTabId: number | null,
	clearClipboard = true
) {
	const { pollingRate, element, selector } = await getOptions();

	// clean up old tab when enabling on a new tab
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
			args: [TARGET, TYPE, clearClipboard, element || INIT_ELEMENT, selector || INIT_SELECTOR]
		});
		await readFromClipboard({ pollingRate });
		await Promise.all(badgeEnablers(tabId));
	} catch (error) {
		console.error(error);
	}
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.active) {
		const [allowedTabId, options] = await Promise.all([getAllowedTabId(), getOptions()]);
		if (options.allowedURL && tab.url?.startsWith(options.allowedURL) && allowedTabId !== tabId) {
			// needed to fix bug where popupTabId is stale when refreshing on another tab
			// which causes toggle to not trigger a storage change.
			await chrome.storage.local.set({ options: { ...options, popupTabId: null } });
			enableClipboardReader(tabId, allowedTabId);
		}
	}
});

// clean up tab when navigating away or refreshing
chrome.webNavigation.onBeforeNavigate.addListener(async ({ tabId, frameType }) => {
	if (frameType !== 'outermost_frame') {
		return;
	}
	const allowedTabId = await getAllowedTabId();
	if (allowedTabId === tabId) {
		try {
			await Promise.all([...tabCleanups(allowedTabId), closeDoc()]);
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
			await closeDoc();
		} catch (error) {
			console.warn(error);
		}
		await setAllowedTabId(null).catch((e) => console.error(e));
	}
});

// watch for changes to the user's options
chrome.storage.onChanged.addListener(async (changes, area) => {
	const newOpts: Options = changes.options?.newValue;
	if (area === 'local' && newOpts) {
		const oldOpts: Options = changes.options?.oldValue || {};
		const { allowedURL, popupTabId, changingRate, pollingRate, changingEls, element, selector } =
			newOpts;

		const allowedTabId = await getAllowedTabId();
		if (changingRate) {
			if (allowedTabId) {
				await readFromClipboard({ pollingRate, clearPrevText: false });
			}
			return;
		}

		if (changingEls) {
			if (allowedTabId) {
				try {
					await Promise.all(tabCleanups(allowedTabId));
					await chrome.scripting.executeScript({
						target: { tabId: allowedTabId },
						func: setupContentMessage,
						args: [TARGET, TYPE, false, element || INIT_ELEMENT, selector || INIT_SELECTOR]
					});
					await Promise.all(badgeEnablers(allowedTabId));
				} catch (error) {
					console.warn(error);
				}
			}
			return;
		}

		if (!allowedURL && allowedTabId) {
			// disable clipboard reader
			try {
				await Promise.all([...tabCleanups(allowedTabId), closeDoc()]);
			} catch (error) {
				console.warn(error);
			}
			await setAllowedTabId(null).catch((e) => console.error(e));
		} else if (popupTabId && (allowedTabId !== popupTabId || oldOpts.allowedURL !== allowedURL)) {
			// don't clear clipboard on enable: it's done in the popup instead because
			// it doesn't work here (document isn't in focus while using popup).
			enableClipboardReader(popupTabId, allowedTabId, false);
		}
	}
});
