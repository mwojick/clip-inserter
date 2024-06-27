<script lang="ts">
	let currentTab: chrome.tabs.Tab | null = $state(null);
	let options = $state({});

	$inspect('currentTab', currentTab);
	$inspect('OPTS', options);

	async function getCurrentTab() {
		let queryOptions = { active: true, lastFocusedWindow: true };
		let [tab = null] = await chrome.tabs.query(queryOptions);
		return tab;
	}

	$effect(() => {
		async function getInitialData() {
			const [ct, data] = await Promise.all([getCurrentTab(), chrome.storage.sync.get('options')]);
			currentTab = ct;
			options = { ...options, ...data.options };
		}

		getInitialData().catch((e) => console.error(e));
	});
</script>

<main>
	{#if currentTab}
		<div class="text-2xl font-bold underline">{currentTab.url}</div>
	{/if}
</main>

<style>
</style>
