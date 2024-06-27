<script lang="ts">
	let currentUrl: string = $state('');
	let options: { allowedURL: string; popupTabId: number | null } = $state({
		allowedURL: '',
		popupTabId: null
	});

	let isClipEnabled = $derived(options.allowedURL === currentUrl);

	$inspect('currentUrl', currentUrl);
	$inspect('OPTS', options);

	async function getCurrentTab() {
		let queryOptions = { active: true, lastFocusedWindow: true };
		let [tab = null] = await chrome.tabs.query(queryOptions);
		return tab;
	}

	$effect(() => {
		async function getInitialData() {
			const [ct, data] = await Promise.all([getCurrentTab(), chrome.storage.local.get('options')]);
			const tabId = ct?.id || null;
			currentUrl = ct?.url || '';
			options = { ...options, ...data.options, popupTabId: tabId };
		}

		getInitialData().catch((e) => console.error(e));
	});

	function onchange(e: Event) {
		const target = e.target as HTMLInputElement;
		const checked = target.checked;
		if (checked) {
			options = { ...options, allowedURL: currentUrl };
		} else {
			options = { ...options, allowedURL: '' };
		}
		chrome.storage.local.set({ options });
	}
</script>

<main>
	{#if currentUrl}
		<div class="text-2xl font-bold underline">{currentUrl}</div>

		<label class="label cursor-pointer">
			<span class="label-text"
				>{isClipEnabled
					? 'Disable clipboard reader'
					: 'Enable clipboard reader (will clear the clipboard)'}</span
			>
			<input type="checkbox" class="toggle toggle-primary" {onchange} checked={isClipEnabled} />
		</label>
	{/if}
</main>

<style>
</style>
