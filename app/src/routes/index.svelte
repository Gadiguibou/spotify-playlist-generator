<script lang="ts">
    import Nav from "$lib/Nav.svelte";
    import { refreshAccessToken, spotifyLogin } from "$lib/apiUtilities/authorization";
    import {
        getUsersPlaylists,
        getPlaylistItems,
        searchPlaylists,
        createPlaylist,
    } from "$lib/apiUtilities/webApi";
    import { onMount } from "svelte";

    const necessaryScopes = [
        "playlist-read-private",
        "playlist-modify-private",
        "playlist-modify-public",
    ];

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

    function* takeWhile<T>(predicate: (item: T) => Boolean, items: Iterable<T>) {
        for (const i of items) {
            if (predicate(i)) {
                yield i;
            } else {
                break;
            }
        }
    }

    let accessToken = null;
    let userPlaylists = [];
    let playlistQueryText = "";
    let queriedPlaylists = [];
    let playlistQueryActive = false;
    let playlistItems = [];
    let targetDuration = 30;
    let randomTrackSelection = [];
    let blacklistedTracks = [];
    $: {
        const shuffledTracks = playlistItems
            .filter((i) => i.track && !i.track.is_local && !blacklistedTracks.map((t) => t.id).includes(i.track.id))
            .map((i) => i.track)
            .sort(() => Math.random() - 0.5);
        let runningDurationTotal = 0;
        randomTrackSelection = [];
        while (runningDurationTotal < 1000 * 60 * targetDuration && shuffledTracks.length > 0) {
            const track = shuffledTracks.pop();
            randomTrackSelection.push(track);
            runningDurationTotal += track.duration_ms;
        }
    }
    let newPlaylist = {
        tracks: [],
        name: "Cool party playlist",
        description: "",
        public: true,
        collaborative: false,
    };
    let createdPlaylistUrl = "";
    onMount(async () => {
        accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            userPlaylists = await getUsersPlaylists(accessToken);
        }
        console.log(userPlaylists);
    });
</script>

<svelte:head>
    <title>Welcome!</title>
</svelte:head>

<main class="container">
    <Nav />
    {#if accessToken}
        <h1>Generate a playlist</h1>
        <button on:click={() => spotifyLogin(necessaryScopes)}>Re-login with Spotify</button>
        <button on:click={refreshAccessToken}>Refresh access token</button>
        <div class="flex">
            <div class="container">
                <h2>Search for a playlist</h2>
                <form>
                    <input bind:value={playlistQueryText} placeholder="Enter a playlist name..." />
                    <button
                        type="submit"
                        on:click|preventDefault={async () => {
                            if (playlistQueryText.trim().length > 0) {
                                queriedPlaylists = await searchPlaylists(
                                    accessToken,
                                    playlistQueryText
                                );
                                playlistQueryActive = true;
                            } else {
                                playlistQueryActive = false;
                            }
                        }}>Search</button
                    >
                </form>
                {#if !playlistQueryActive}
                    <p>Showing your playlists</p>
                {/if}
                <ul class="container">
                    {#each playlistQueryActive ? queriedPlaylists : userPlaylists as playlist}
                        <li class="playlist-entry">
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
                                    playlistItems = await getPlaylistItems(
                                        accessToken,
                                        playlist.id
                                    );
                                    console.log(playlistItems);
                                }}>Get playlist items</button
                            >
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="container">
                <h2>Random selection</h2>
                <div>
                    <label for="target-duration">Desired duration (minutes): </label>
                    <input id="target-duration" type="number" bind:value={targetDuration} />
                </div>
                <button
                    on:click={() => {
                        newPlaylist.tracks = [...newPlaylist.tracks, ...randomTrackSelection];
                    }}
                >
                    Add random selection to new playlist
                </button>
                <ul class="container">
                    {#each randomTrackSelection as track}
                        <li class="random-selection-entry">
                            <p>{track.name}</p>
                            <button
                                on:click={() => (blacklistedTracks = [...blacklistedTracks, track])}
                                ><img
                                    src="/trash-outline.svg"
                                    alt="Trash icon"
                                    style="height: 1rem;"
                                />Blacklist track</button
                            >
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="container">
                <h2>New playlist tracks</h2>
                <form>
                    <div class="container">
                        <label for="new-playlist-name">Playlist name: </label>
                        <input id="new-playlist-name" type="text" bind:value={newPlaylist.name} />
                    </div>
                    <div class="container">
                        <label for="new-playlist-description">Playlist description: </label>
                        <textarea
                            id="new-playlist-description"
                            bind:value={newPlaylist.description}
                        />
                    </div>
                    <div class="container">
                        <label for="new-playlist-public">Public: </label>
                        <input
                            id="new-playlist-public"
                            type="checkbox"
                            bind:checked={newPlaylist.public}
                        />
                    </div>
                    <div class="container">
                        <label for="new-playlist-collaborative">Collaborative: </label>
                        <input
                            id="new-playlist-collaborative"
                            type="checkbox"
                            bind:checked={newPlaylist.collaborative}
                        />
                    </div>
                    <button
                        type="submit"
                        on:click|preventDefault={async () => {
                            const playlist = await createPlaylist(accessToken, newPlaylist);
                            createdPlaylistUrl = playlist.external_urls.spotify;
                        }}
                        disabled={newPlaylist.tracks.length === 0}>Add to Spotify</button
                    >
                </form>
                {#if createdPlaylistUrl.trim().length > 0}
                    <p>
                        <a href={createdPlaylistUrl}>View your new playlist on Spotify</a>
                    </p>
                {/if}
                <ul>
                    {#each newPlaylist.tracks as item}
                        <li>{item.name}</li>
                    {/each}
                </ul>
            </div>
        </div>
        <div>
            <h2>Blacklisted tracks</h2>
            <ul>
                {#each blacklistedTracks as track}
                    <li>
                        <p>{track.name}</p>
                        <button
                            on:click={() =>
                                (blacklistedTracks = blacklistedTracks.filter((t) => t !== track))}
                            >Unblacklist track</button
                        >
                    </li>
                {/each}
            </ul>
        </div>
    {:else}
        <h1>Connect to your spotify account</h1>
        <button on:click={() => spotifyLogin(necessaryScopes)}>Login with Spotify</button>
    {/if}
</main>

<style>
    .container {
        padding: 1rem;
    }

    .flex {
        display: flex;
    }

    .flex > * {
        flex: 1 1 0;
    }

    .playlist-entry {
        width: 100%;
        display: flex;
        margin-top: 1rem;
    }

    .playlist-entry > *:not(:first-child) {
        margin-left: 1rem;
    }

    .playlist-entry > :last-child {
        margin-left: auto;
    }

    .random-selection-entry {
        width: 100%;
        display: flex;
    }

    .random-selection-entry > *:not(:first-child) {
        margin-left: 1rem;
    }

    .random-selection-entry > :last-child {
        margin-left: auto;
    }
    .flex ul {
        height: 75vh;
        overflow: hidden;
        overflow-y: scroll;
    }
</style>
