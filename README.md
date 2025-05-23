## [Chrome web store](https://chromewebstore.google.com/detail/clip-inserter/jopbnihpjbeladnonckkpocbdcglddpb)

## [Firefox add-ons](https://addons.mozilla.org/en-US/firefox/addon/clip-inserter/) (also available on Firefox for Android)

## Description

- A browser extension that takes text copied to the clipboard and inserts it into the page.
- Primarily meant to be used alongside apps that augment the inserted text, such as [Cliperl](https://www.cliperl.com/) (for language learning or translation)
- Supports Chrome's Manifest V3 using the offscreen API.

## Requirements

- Chrome 109+ (for offscreen API support)
- Firefox (tested on 131+)

## Functionality

- Only runs on a single site/tab at a time in order to limit the access it has.
- Remembers the last site you enabled it on so that it switches on automatically when navigating back to the site.
  - To prevent it activating on its own in the background, the tab needs to be active when loading the page (i.e. it won't auto-enable on a tab that loads in the background).
- Disabled automatically when navigating away or closing the tab/window.
- Clears the clipboard on activation so that you don't inadvertently paste something that was on the clipboard beforehand.

  - Note: Chrome has a limitation where the clipboard can't be completely cleared when the document isn't focused, so instead a single space is copied to the clipboard. In practice though this doesn't effect functionality since it's still considered empty when checking for changes to the clipboard.

- Can configure the following in the popup:
  - Enable/disable on the current site/tab (some pages are restricted like the new tab page).
  - Clear the clipboard on page insert.
  - The polling rate at which it checks the clipboard for new text.
  - The HTML element that wraps the text when inserting into the page.
  - The query selector that's used to find where in the page to insert the text.

## Usage

### To use in incognito mode or with local files:

- Chrome: **chrome://extensions** -> extension details -> 'Allow in incognito' or 'Allow access to file URLs'
- Firefox: **about:addons** -> extension details -> 'Run in Private Windows'

## Acknowledgements

- Inspired by past clipboard inserter extensions:

  - https://github.com/laplus-sadness/lap-clipboard-inserter
  - https://github.com/kmltml/clipboard-inserter

- [Clipboard icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/clipboard) ([Link to icon used](https://www.flaticon.com/free-icon/clipboard_5480173))

## Built with

- [WXT](https://wxt.dev/)
- [Svelte](https://svelte.dev/)
- [Tailwind](https://tailwindcss.com/)
- [Daisy UI](https://daisyui.com/)

## Build / Zip

```bash
pnpm i

# Chrome
pnpm build
pnpm zip

# Firefox
pnpm build:firefox
pnpm zip:firefox
```

## Development

### Using Nix:

- Ensure you have Nix installed: https://nixos.org/download.html
- And flakes enabled: https://nixos.wiki/wiki/Flakes
- Install nix-direnv: https://github.com/nix-community/nix-direnv
- Hook direnv into shell: https://direnv.net/docs/hook.html

#### direnv and nix-direnv will allow nix deps to be auto loaded into your shell when you cd into the repo.

```bash
# Allow direnv to use .envrc
direnv allow

# Install dependencies
pnpm install

# Run in dev mode for Chrome (Manifest V3)
pnpm dev

# Run in dev mode for Firefox (Manifest V2)
pnpm dev:firefox
```

The dev server will start and provide instructions for loading the unpacked extension in your browser:

1. For Chrome: Go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked" to select the extension's build directory.
2. For Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on...", and select the extension's manifest file.

After making changes to the code, the development server will automatically rebuild the extension.
