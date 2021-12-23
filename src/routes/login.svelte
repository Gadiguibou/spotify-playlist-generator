<script lang="ts">
    import Nav from "$lib/Nav.svelte";
    import { accessTokenStore, spotifyLogin } from "$lib/apiUtilities/authorization";
    import { onMount } from "svelte";
    import { get } from "svelte/store";

    const necessaryScopes = [
        "playlist-read-private",
        "playlist-modify-private",
        "playlist-modify-public",
    ];

    onMount(() => {
        if (get(accessTokenStore)) {
            window.location.assign("/");
        }
    });
</script>

<Nav />
<h1>Connect to your spotify account</h1>
<button on:click={() => spotifyLogin(necessaryScopes)}>Login with Spotify</button>
