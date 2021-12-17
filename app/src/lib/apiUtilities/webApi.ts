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
    album: object;
    artists: object[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: object;
    external_urls: object;
    href: string;
    id: string;
    is_playable: boolean;
    linked_from: object;
    restricitions: object;
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
    external_urls: object;
    href: string;
    id: string;
    images: object[];
    name: string;
    release_date: string;
    release_date_precision: string;
    restrictions: object;
    type: string;
    uri: string;
    artists: object[];
    tracks: object[];
};

type SpotifyApiArtistResponse = {
    external_urls: object;
    followers: object;
    genres: string[];
    href: string;
    id: string;
    images: object[];
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
    external_urls: object;
    href: string;
    id: string;
    images: object[];
    is_externally_hosted: boolean;
    languages: string[];
    media_type: string;
    name: string;
    publisher: string;
    type: string;
    uri: string;
    episodes: object[];
};

type SpotifyApiEpisodeResponse = {
    audio_preview_url: string;
    description: string;
    html_description: string;
    duration_ms: number;
    explicit: boolean;
    external_urls: object;
    href: string;
    id: string;
    images: object[];
    is_externally_hosted: boolean;
    is_playable: boolean;
    languages: string[];
    name: string;
    release_date: string;
    release_date_precision: string;
    resume_point: object;
    type: string;
    uri: string;
    restrictions: object;
    show: object;
};

type SpotifyApiPlaylistResponse = {
    collaborative: boolean;
    description: string | null;
    external_urls: object;
    followers: object;
    href: string;
    id: string;
    images: object[];
    name: string;
    owner: object;
    public: boolean;
    snapshot_id: string;
    tracks: object;
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
