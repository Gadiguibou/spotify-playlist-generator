const apiUrl = "https://api.spotify.com/v1";

type SpotifyApiListResponse<T> = {
    href: string;
    items: T[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
};

type SpotifyApiTrackResponse = {
    album: any;
    artists: any[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: any;
    external_urls: any;
    href: string;
    id: string;
    is_playable: boolean;
    linked_from: any;
    restricitions: any;
    name: string;
    popularity: number;
    preview_url: string;
    track_number: number;
    type: string;
    uri: string;
    is_local: boolean;
};

type SpotifyApiAlbumResponse = {
    album_type: string;
    total_tracks: number;
    available_markets: string[];
    external_urls: any;
    href: string;
    id: string;
    images: any[];
    name: string;
    release_date: string;
    release_date_precision: string;
    restrictions: any;
    type: string;
    uri: string;
    artists: any[];
    tracks: any[];
};

type SpotifyApiArtistResponse = {
    external_urls: any;
    followers: any;
    genres: string[];
    href: string;
    id: string;
    images: any[];
    name: string;
    popularity: number;
    type: string;
    uri: string;
};

type SpotifyApiShowResponse = {
    available_markets: string[];
    copyright: string;
    description: string;
    html_description: string;
    explicit: boolean;
    external_urls: any;
    href: string;
    id: string;
    images: any[];
    is_externally_hosted: boolean;
    languages: string[];
    media_type: string;
    name: string;
    publisher: string;
    type: string;
    uri: string;
    episodes: any[];
};

type SpotifyApiEpisodeResponse = {
    audio_preview_url: string;
    description: string;
    html_description: string;
    duration_ms: number;
    explicit: boolean;
    external_urls: any;
    href: string;
    id: string;
    images: any[];
    is_externally_hosted: boolean;
    is_playable: boolean;
    languages: string[];
    name: string;
    release_date: string;
    release_date_precision: string;
    resume_point: any;
    type: string;
    uri: string;
    restrictions: any;
    show: any;
};

type SpotifyApiPlaylistResponse = {
    collaborative: boolean;
    description: string | null;
    external_urls: any;
    followers: any;
    href: string;
    id: string;
    images: any[];
    name: string;
    owner: any;
    public: boolean;
    snapshot_id: string;
    tracks: any;
    type: string;
    uri: string;
};

type SpotifyPlaylistItem = SpotifyApiTrackResponse | SpotifyApiEpisodeResponse;

type SpotifyApiErrorResponse = {
    error: {
        status: number;
        message: string;
    };
};

function generateCommonHeaders(accessToken: string) {
    const headers = new Headers();
    headers.append("Authorization", "Bearer " + accessToken);
    headers.append("Content-Type", "application/json");
    return headers;
}

async function fetchAndReduceSpotifyApiList<A, B>(
    input: RequestInfo,
    init: RequestInit,
    callbackFn: (previousValue: B, currentValue: SpotifyApiListResponse<A>) => B,
    initialValue: B
): Promise<B> {
    let previousValue = initialValue;
    let next = input;
    do {
        const response = await fetch(next, init);
        const data = await response.json();
        previousValue = callbackFn(previousValue, data);
        next = data.next;
    } while (next);
    return previousValue;
}

export async function getUsersPlaylists(
    accessToken: string
): Promise<SpotifyApiPlaylistResponse[]> {
    const requestUrl = new URL(apiUrl + "/me/playlists");
    const options = {
        method: "GET",
        headers: generateCommonHeaders(accessToken),
    };
    return fetchAndReduceSpotifyApiList(
        requestUrl.href,
        options,
        (
            previousValue: SpotifyApiPlaylistResponse[],
            currentValue: SpotifyApiListResponse<SpotifyApiPlaylistResponse>
        ) => previousValue.concat(currentValue.items),
        []
    );
}

export async function getPlaylistItems(
    accessToken: string,
    playlistId: string
): Promise<SpotifyPlaylistItem[]> {
    const requestUrl = new URL(apiUrl + `/playlists/${playlistId}/tracks`);
    const options = {
        method: "GET",
        headers: generateCommonHeaders(accessToken),
    };
    return fetchAndReduceSpotifyApiList(
        requestUrl.href,
        options,
        (
            previousValue: SpotifyPlaylistItem[],
            currentValue: SpotifyApiListResponse<SpotifyPlaylistItem>
        ) => previousValue.concat(currentValue.items),
        []
    );
}

export async function searchPlaylists(
    accessToken: string,
    queryString: string
): Promise<SpotifyApiPlaylistResponse[]> {
    const requestUrl = new URL(apiUrl + "/search");
    requestUrl.searchParams.set("type", "playlist");
    requestUrl.searchParams.set("q", queryString);
    requestUrl.searchParams.set("limit", "50");
    const options = {
        method: "GET",
        headers: generateCommonHeaders(accessToken),
    };
    return fetch(requestUrl.href, options)
        .then((response) => response.json())
        .then((data) => data.playlists.items);
}

export async function createPlaylist(
    accessToken: string,
    playlist: {
        tracks: SpotifyApiTrackResponse[];
        name: string;
        description: string;
        public: boolean;
        collaborative: boolean;
    }
): Promise<SpotifyApiPlaylistResponse> {
    const user = await fetch(apiUrl + "/me", {
        method: "GET",
        headers: generateCommonHeaders(accessToken),
    }).then((response) => response.json());

    const createdPlaylist = await fetch(apiUrl + `/users/${user.id}/playlists`, {
        method: "POST",
        headers: generateCommonHeaders(accessToken),
        body: JSON.stringify({
            name: playlist.name,
            description: playlist.description,
            public: playlist.public,
            collaborative: playlist.collaborative,
        }),
    }).then((response) => response.json());

    for (let i = 0; i < playlist.tracks.length; i += 100) {
        const uris = playlist.tracks.slice(i * 100, (i + 1) * 100).map((track) => track.uri);
        await fetch(apiUrl + `/playlists/${createdPlaylist.id}/tracks`, {
            method: "POST",
            headers: generateCommonHeaders(accessToken),
            body: JSON.stringify({
                uris: uris,
            }),
        }).then((response) => response.json());
    }
    return createdPlaylist;
}
