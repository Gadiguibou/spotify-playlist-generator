<script lang="ts">
    import { requestAccessToken, stateStore } from "$lib/apiUtilities/authorization";

    import { onMount } from "svelte";
    import { get } from "svelte/store";

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);

        if (get(stateStore) !== urlParams.get("state")) {
            window.location.replace("/error");
            throw new Error("State mismatch");
        }

        if (urlParams.get("error") !== null) {
            window.location.replace("/error");
            throw new Error(urlParams.get("error"));
        }

        const code = urlParams.get("code");
        if (code == null) {
            window.location.replace("/error");
            throw new Error("Code not found");
        }

        await requestAccessToken(code);
        window.location.replace("/");
    });
</script>

<h1>Authenticating you...</h1>
