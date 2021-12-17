<script lang="ts">
    import Nav from "$lib/Nav.svelte";
    import { refreshAccessToken, spotifyLogin } from "$lib/apiUtilities/authorization";
    import { getUsersPlaylists, getPlaylistItems } from "$lib/apiUtilities/webApi";
    import { onMount } from "svelte";

    let accessToken = null;
    let userPlaylists = [];
    let playlistItems = [];
    onMount(async () => {
        accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            userPlaylists = await getUsersPlaylists(accessToken);
        }
        console.log(userPlaylists);
    });

    function getMinimalSizeImageUrl(
        height: number,
        width: number,
        images: { height: number; width: number; url: string }[]
    ): string | undefined {
        let image = images
            .filter((i) => i.height > height && i.width > width)
            .sort((a, b) => a.height * a.width - b.height * b.width)[0];
        if (!image && images.length > 0) {
            return images[0].url;
        } else if (!image) {
            return undefined;
        } else {
            return image.url;
        }
    }
</script>

<svelte:head>
    <title>Welcome!</title>
</svelte:head>

<Nav />
{#if accessToken}
    <h1>Generate a playlist</h1>
    <button on:click={() => spotifyLogin(["playlist-read-private"])}>Re-login with Spotify</button>
    <button on:click={refreshAccessToken}>Refresh access token</button>
    <div>
        <div>
            <h2>Your playlists</h2>
            <p>Number of playlists: {userPlaylists.length}</p>
            <ul>
                {#each userPlaylists as playlist}
                    <li>
                        <img
                            src={getMinimalSizeImageUrl(50, 50, playlist.images) ||
                                "/music-note-list.svg"}
                            alt="Playlist cover"
                            height="50"
                            width="50"
                        />
                        <p><a href={playlist.external_urls.spotify}>{playlist.name}</a></p>
                        <button
                            on:click={async () => {
                                playlistItems = await getPlaylistItems(accessToken, playlist.id);
                                console.log(playlistItems);
                            }}>Get playlist items</button
                        >
                    </li>
                {/each}
            </ul>
        </div>
        <div>
            <h2>Playlist tracks</h2>
            <ul>
                {#each playlistItems as item}
                    <p>{item.track.name}</p>
                {/each}
            </ul>
        </div>
    </div>
{:else}
    <h1>Connect to your spotify account</h1>
    <button on:click={() => spotifyLogin(["playlist-read-private"])}>Login with Spotify</button>
{/if}
