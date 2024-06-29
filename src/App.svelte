<script lang="ts">
	import type { Options } from '$lib/types';
	import { INIT_RATE } from '$lib/constants';
	const minRange = 100;
	const maxRange = 3000;

	let currentUrl: string = $state('');
	let allowedTabId: number | null = $state(null);
	let options: Options = $state({
		popupTabId: null,
		allowedURL: '',
		pollingRate: INIT_RATE,
		changingRate: false
	});

	let isClipEnabled = $derived(allowedTabId && allowedTabId === options.popupTabId);

	async function getCurrentTab() {
		let queryOptions = { active: true, lastFocusedWindow: true };
		let [tab = null] = await chrome.tabs.query(queryOptions);
		return tab;
	}

	$effect(() => {
		async function getInitialData() {
			const [ct, atid, opts] = await Promise.all([
				getCurrentTab(),
				chrome.storage.local.get('allowedTabId'),
				chrome.storage.local.get('options')
			]);
			const tabId = ct?.id || null;
			currentUrl = ct?.url || '';
			allowedTabId = atid?.allowedTabId || null;
			options = { ...options, ...opts.options, popupTabId: tabId };
		}

		getInitialData().catch((e) => console.error(e));
	});

	async function onToggle(e: Event) {
		const target = e.target as HTMLInputElement;
		const checked = target.checked;
		if (checked) {
			try {
				await navigator.clipboard.writeText('');
			} catch (error) {
				console.warn(error);
			}

			options = { ...options, allowedURL: currentUrl, changingRate: false };
			allowedTabId = options.popupTabId;
		} else {
			options = { ...options, allowedURL: '', changingRate: false };
			allowedTabId = null;
		}
		chrome.storage.local.set({ options });
	}

	function onPollChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseInt(target.value);
		options.pollingRate = value;
		options.changingRate = true;
		chrome.storage.local.set({ options });
	}

	function onsubmit(e: Event) {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		const { element, selector } = Object.fromEntries(formData) as {
			element: string;
			selector: string;
		};
		console.log('element:', element);
		console.log('selector:', selector);
	}
</script>

<main>
	{#if currentUrl}
		{#if currentUrl.startsWith('http')}
			<label class="label cursor-pointer justify-center">
				<span class="label-text text-base"
					>{isClipEnabled ? 'Clipboard reader enabled' : 'Clipboard reader disabled'}</span
				>
				<input
					type="checkbox"
					class="toggle toggle-primary ml-4"
					onchange={onToggle}
					checked={isClipEnabled}
				/>
			</label>
		{:else}
			<div class="label-text text-base">Disabled on non-http(s) sites</div>
		{/if}

		<h4 class="label-text mt-4">Polling rate: {options.pollingRate / 1000}s</h4>
		<input
			type="range"
			min={minRange}
			max={maxRange}
			value={options.pollingRate}
			onchange={onPollChange}
			class="range range-primary mt-1"
			step={minRange}
		/>

		<div class="label-text flex w-full justify-between px-1">
			<span>0.1</span>
			<span>3</span>
		</div>

		<form {onsubmit}>
			<label class="input input-bordered input-primary mt-4 flex items-center gap-2">
				Element
				<input
					name="element"
					type="text"
					class="grow"
					placeholder="p"
					title="The HTML element used to wrap the text when inserting into the page (called with document.createElement)."
				/>
			</label>

			<label class="input input-bordered input-primary mt-2 flex items-center gap-2">
				Selector
				<input
					name="selector"
					type="text"
					class="grow"
					placeholder="body"
					title="The target queried to insert the element into the page (called with document.querySelector)."
				/>
			</label>
			<button class="btn btn-primary mt-2 w-32 text-xs">Update Element/Selector</button>
		</form>

		{#if options.allowedURL}
			<div class="mt-4">
				Allowed on:
				<a href={options.allowedURL} target="_blank" rel="noreferrer">
					{options.allowedURL}
				</a>
			</div>
		{/if}
	{/if}
</main>

<style>
	main {
		width: 350px;
		word-wrap: break-word;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
	}
</style>
