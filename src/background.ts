type Request = {
	action: 'insert' | 'remove';
	clipText: string;
};

function setupMessage() {
	chrome.runtime.onMessage.addListener(function handleMessage({ action, clipText }: Request) {
		if (action === 'insert') {
			const pasteTarget = document.createElement('p');
			pasteTarget.textContent = clipText;
			document.querySelector('body')?.appendChild(pasteTarget);
		} else if (action === 'remove') {
			chrome.runtime.onMessage.removeListener(handleMessage);
		}
	});
}

let previousText = '';
let timer = null;

function checkClipboard(id: number) {
	console.log(navigator);

	navigator.clipboard
		.readText()
		.then((clipText) => {
			if (clipText && clipText !== previousText) {
				chrome.tabs.sendMessage(id, {
					action: 'insert',
					clipText
				});
				previousText = clipText;
			}
		})
		.catch((error) => console.error(`Failed to read clipboard: ${error}`));
}

chrome.tabs.onUpdated.addListener(async (number, changeInfo, tab) => {
	if (changeInfo.status == 'complete' && tab.url === 'http://localhost:5174/') {
		console.log('number:', number);
		console.log('tab:', tab);

		if (tab.id) {
			await chrome.scripting
				.executeScript({ target: { tabId: tab.id }, func: setupMessage })
				.catch((error) => console.error(`Error executing the content script: ${error}`));
			const id = setInterval(checkClipboard, 2000, tab.id);
			timer = { id, interval: 2000 };
			console.log('timer:', timer);

			chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: 'green' });
			chrome.action.setBadgeText({
				tabId: tab.id,
				text: 'ON'
			});
		}
	}
});

// chrome.action.onClicked.addListener(() =>
// 	chrome.tabs
// 		.query({ active: true, currentWindow: true })
// 		.then((tabs) => {
// 			// console.log('tabs:', tabs);
// 			for (const tab of tabs) {
// 				if (tab.id === undefined) {
// 					console.error(
// 						'Error when querying the tabs: ClipboardInserter ' +
// 							"doesn't work in windows that don't host content " +
// 							'tabs (for example, devtools windows)'
// 					);
// 				} else {
// 					console.log(tab);
// 				}
// 			}
// 		})
// 		.catch((error) => console.error(`Error when querying the tabs: ${error}`))
// );
