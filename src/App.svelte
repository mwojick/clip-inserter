<script lang="ts">
	const minRange = 100;
	const maxRange = 3000;

	let currentUrl: string = $state('');
	let allowedTabId: number | null = $state(null);
	let options: { popupTabId: number | null; allowedURL: string; pollingInterval: number } = $state({
		popupTabId: null,
		allowedURL: '',
		pollingInterval: 500
	});

	let isClipEnabled = $derived(allowedTabId && allowedTabId === options.popupTabId);

	$inspect('currentUrl', currentUrl);
	$inspect('allowedTabId', allowedTabId);
	$inspect('OPTS', options);

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

	function onToggle(e: Event) {
		const target = e.target as HTMLInputElement;
		const checked = target.checked;
		if (checked) {
			options = { ...options, allowedURL: currentUrl };
			allowedTabId = options.popupTabId;
		} else {
			options = { ...options, allowedURL: '' };
			allowedTabId = null;
		}
		chrome.storage.local.set({ options });
	}

	function onPollChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseInt(target.value);
		options.pollingInterval = value;
		chrome.storage.local.set({ options });
	}
</script>

<main>
	{#if currentUrl}
		<div class="text-2xl font-bold underline">{currentUrl}</div>

		<label class="label cursor-pointer">
			<span class="label-text"
				>{isClipEnabled ? 'Clipboard reader enabled' : 'Clipboard reader disabled'}</span
			>
			<input
				type="checkbox"
				class="toggle toggle-primary"
				onchange={onToggle}
				checked={isClipEnabled}
			/>
		</label>

		<h4>Polling interval: {options.pollingInterval / 1000}s</h4>
		<input
			type="range"
			min={minRange}
			max={maxRange}
			value={options.pollingInterval}
			onchange={onPollChange}
			class="range range-primary"
			step={minRange}
		/>

		<div class="flex w-full justify-between px-2 text-xs">
			<span>0.1</span>
			<span>3</span>
		</div>
	{/if}
</main>

<style>
</style>
