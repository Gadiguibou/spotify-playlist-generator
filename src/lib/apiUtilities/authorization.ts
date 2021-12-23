import { browser } from "$app/env";
import { get, writable } from "svelte/store";

const authorizationApiUrl = "https://accounts.spotify.com";
const baseUrl = import.meta.env.VITE_BASE_URL;
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;

function sessionStorageWritable<T>(key: string, initialValue: T) {
    if (browser) {
        const store = writable(JSON.parse(sessionStorage.getItem(key)) || initialValue);
        store.subscribe((value) => {
            sessionStorage.setItem(key, JSON.stringify(value));
        });

        return store;
    }
}

function localStorageWritable<T>(key: string, initialValue: T) {
    if (browser) {
        const store = writable(JSON.parse(localStorage.getItem(key)) || initialValue);
        store.subscribe((value) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
        return store;
    }
}

export const accessTokenStore = localStorageWritable<string | null>("accessToken", null);
export const refreshTokenStore = localStorageWritable<string | null>("refreshToken", null);
export const codeVerifierStore = sessionStorageWritable<string | null>("codeVerifier", null);
export const stateStore = sessionStorageWritable<string | null>("state", null);

export async function spotifyLogin(scopes: string[]): Promise<void> {
    if (browser) {
        const state = generateRandomString(
            32,
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        );
        stateStore.set(state);

        const codeVerifier = generateRandomString(
            128,
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~"
        );
        codeVerifierStore.set(codeVerifier);

        const codeChallenge = await generateCodeChallenge(codeVerifier).then(base64UrlEncode);

        const queryParams = {
            client_id: clientId,
            response_type: "code",
            redirect_uri: baseUrl + "/callback",
            scope: scopes.join(" "),
            state: state,
            code_challenge_method: "S256",
            code_challenge: codeChallenge,
        };

        const requestUrl = new URL(authorizationApiUrl + "/authorize");

        Object.entries(queryParams).forEach(([key, value]) =>
            requestUrl.searchParams.append(key, value)
        );

        window.location.assign(requestUrl.href);
    }
}

export async function requestAccessToken(code: string): Promise<void> {
    const headers = generateCommonHeaders();

    const codeVerifier = get(codeVerifierStore);
    if (codeVerifier == null) {
        window.location.replace("/error");
        throw new Error("Code verifier not found");
    }

    const form = new URLSearchParams({
        grant_type: "authorization_code",
        code: code!,
        redirect_uri: baseUrl + "/callback",
        client_id: clientId,
        code_verifier: codeVerifier!,
    });

    return fetch(new URL(authorizationApiUrl + "/api/token").href, {
        method: "POST",
        headers: headers,
        body: form,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                window.location.replace("/error");
                throw new Error(`${data.error} - ${data.error_description}`);
            }
            const accessToken = data.access_token;
            const refreshToken = data.refresh_token;
            if (!accessToken || !refreshToken) {
                window.location.replace("/error");
                throw new Error("Access token or refresh token not found");
            }
            accessTokenStore.set(accessToken);
            refreshTokenStore.set(refreshToken);
        });
}

export async function refreshAccessToken(): Promise<void> {
    if (browser) {
        const refreshToken = get(refreshTokenStore);
        if (refreshToken == null) {
            window.location.replace("/error");
            throw new Error("Refresh token not found");
        }
        const requestUrl = new URL(authorizationApiUrl + "/api/token").href;
        const headers = generateCommonHeaders();
        const form = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
        });

        return fetch(requestUrl, {
            method: "POST",
            headers: headers,
            body: form,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.access_token) {
                    accessTokenStore.set(data.access_token);
                } else {
                    throw new Error("No access token returned");
                }
                if (data.refresh_token) {
                    refreshTokenStore.set(data.refresh_token);
                }
            });
    }
}

function generateCommonHeaders(): Headers {
    return new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
    });
}

function generateRandomString(length: number, possibleCharacters: string): string {
    let randomIntArray = new Uint8Array(length);
    crypto.getRandomValues(randomIntArray);
    const randomCharCodeArray = randomIntArray.map((i) =>
        possibleCharacters.charCodeAt(i % possibleCharacters.length)
    );
    return String.fromCharCode(...randomCharCodeArray);
}

function generateCodeChallenge(codeVerifier: string): Promise<ArrayBuffer> {
    const codeVerifierBytes = new TextEncoder().encode(codeVerifier);
    return crypto.subtle.digest("SHA-256", codeVerifierBytes);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const base64String = btoa(String.fromCharCode(...byteArray));
    return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
