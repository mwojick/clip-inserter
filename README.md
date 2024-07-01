## Description

- A Chrome extension that takes text copied to the clipboard and inserts it into the page.
- Supports Chrome's Manifest V3 using a service worker and the offscreen API.

## Requirements

- Chrome 109+ for offscreen API support

## Functionality

- Only runs on a single site/tab at a time in order to limit the access it has.
- Remembers the last site you enabled it on so that it switches on automatically when navigating back to the site.
  - To prevent it activating on its own in the background, the tab needs to be active when loading the page (i.e. it won't auto-enable on a tab that loads in the background).
- Disabled automatically when navigating away or closing the tab/window.
- Attempts to clear your clipboard on activation so that you don't inadvertently paste something that was on the clipboard beforehand.

  - This may fail if the document isn't focused at the time it attempts to clear it, but it's not likely to happen unless you go out of your way.

- Can configure the following in the popup:
  - Enable/disable on the current site/tab (only on http(s) and file URLs).
  - The polling rate at which it checks the clipboard for new text (from 100ms to 3s).
  - The HTML element that wraps the text when inserting into the page.
  - The query selector that's used to find where in the page to insert the text.

## Usage

### To use in incognito mode or with local files:

- Open **chrome://extensions**, go to the extension details, then click 'Allow in incognito' or 'Allow access to file URLs' respectively.

## Acknowledgements

- Inspired by past clipboard inserter extensions:

  - https://github.com/laplus-sadness/lap-clipboard-inserter
  - https://github.com/kmltml/clipboard-inserter

- [Clipboard icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/clipboard) ([Link to icon used](https://www.flaticon.com/free-icon/clipboard_5480173))
