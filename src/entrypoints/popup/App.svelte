<script lang="ts">
	import { onMount } from 'svelte';
	import type { Options } from '$lib/types';
	import { INIT_RATE, INIT_ELEMENT, INIT_SELECTOR } from '$lib/constants';
	const minRange = 100;
	const maxRange = 3000;

	let showSuccess: boolean = $state(false);
	let currentUrl: string = $state('');
	let allowedTabId: number | null = $state(null);
	let options: Options = $state({
		popupTabId: null,
		allowedURL: '',
		pollingRate: INIT_RATE,
		element: '',
		selector: '',
		changingRate: false,
		changingEls: false
	});

	let isClipEnabled = $derived(allowedTabId && allowedTabId === options.popupTabId);

	async function getCurrentTab() {
		let queryOptions = { active: true, lastFocusedWindow: true };
		let [tab = null] = await browser.tabs.query(queryOptions);
		return tab;
	}

	onMount(() => {
		async function setInitialData() {
			const [ct, atid, opts] = await Promise.all([
				getCurrentTab(),
				browser.storage.local.get('allowedTabId'),
				browser.storage.local.get('options')
			]);
			const tabId = ct?.id || null;
			currentUrl = ct?.url || '';
			allowedTabId = atid?.allowedTabId || null;
			options = { ...options, ...opts.options, popupTabId: tabId };
		}

		setInitialData().catch((e) => console.error(e));
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

			options = { ...options, allowedURL: currentUrl, changingRate: false, changingEls: false };
			allowedTabId = options.popupTabId;
		} else {
			options = { ...options, allowedURL: '', changingRate: false, changingEls: false };
			allowedTabId = null;
		}
		browser.storage.local.set({ options });
	}

	function onPollChanging(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseInt(target.value);
		options.pollingRate = value;
	}

	function onPollEnd() {
		options.changingRate = true;
		options.changingEls = false;
		browser.storage.local.set({ options });
	}

	async function onsubmit(e: Event) {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		const { element, selector } = Object.fromEntries(formData) as {
			element: string;
			selector: string;
		};

		if (element !== options.element || selector !== options.selector) {
			options = {
				...options,
				element: element,
				selector: selector,
				changingRate: false,
				changingEls: true
			};
			await browser.storage.local.set({ options });
			showSuccess = true;
			setTimeout(() => {
				showSuccess = false;
			}, 600);
		}
	}
</script>

<main>
	{#if currentUrl}
		{#if (currentUrl.startsWith('http') || currentUrl.startsWith('file')) && !currentUrl.startsWith('https://chromewebstore')}
			<label class="label ml-3 cursor-pointer justify-start">
				<span class="label-text w-48 text-left text-base"
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
			<div class="label-text text-base">Disabled on this site</div>
		{/if}

		<h4 class="label-text ml-24 mt-4 text-left">Polling rate: {options.pollingRate / 1000}s</h4>
		<input
			type="range"
			min={minRange}
			max={maxRange}
			value={options.pollingRate}
			oninput={onPollChanging}
			onchange={onPollEnd}
			class="range range-primary mt-1"
			step={minRange}
		/>

		<div class="label-text flex w-full justify-between px-1">
			<span>0.1</span>
			<span>3</span>
		</div>

		<form {onsubmit}>
			<label
				class={`input input-bordered input-primary ${showSuccess && 'input-accent'} mt-4 flex items-center gap-2`}
			>
				Element
				<input
					name="element"
					type="text"
					class="grow"
					placeholder={INIT_ELEMENT}
					value={options.element}
					autocomplete="off"
					title="HTML element used to wrap the text when inserting into the page (called with document.createElement)."
				/>
			</label>

			<label
				class={`input input-bordered input-primary ${showSuccess && 'input-accent'} mt-2 flex items-center gap-2`}
			>
				Selector
				<input
					name="selector"
					type="text"
					class="grow"
					placeholder={INIT_SELECTOR}
					value={options.selector}
					autocomplete="off"
					title="Used to find what element on the page to insert the text into (called with document.querySelector)."
				/>
			</label>
			<button class="btn btn-primary mt-4 w-36 text-sm">Update Element/Selector</button>
		</form>

		{#if options.allowedURL}
			<div class="mt-4 overflow-hidden text-ellipsis whitespace-nowrap">
				Allowed on:
				<a
					class="text-primary"
					href={options.allowedURL}
					title={options.allowedURL}
					target="_blank"
					rel="noreferrer"
				>
					{options.allowedURL}
				</a>
			</div>
		{/if}
	{:else}
		<div class="label-text text-base">Loading...</div>
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

	label {
		transition: border-color 0.3s;
	}
</style>
