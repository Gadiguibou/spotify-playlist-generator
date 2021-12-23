import { browser } from "$app/env";

const authorizationApiUrl = "https://accounts.spotify.com";
const baseUrl = import.meta.env.VITE_BASE_URL;
const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;

export async function spotifyLogin(scopes: string[]): Promise<void> {
    if (browser) {
        const state = generateRandomString(
            32,
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        );
        sessionStorage.setItem("state", state);

        const codeVerifier = generateRandomString(
            128,
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~"
        );
        sessionStorage.setItem("codeVerifier", codeVerifier);

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

    const codeVerifier = sessionStorage.getItem("codeVerifier");
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
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", refreshToken);
        });
}

export async function refreshAccessToken(): Promise<void> {
    if (browser) {
        const refreshToken = localStorage.getItem("refreshToken");
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
                localStorage.setItem("accessToken", data.access_token);
                if (data.refresh_token) {
                    localStorage.setItem("refreshToken", data.refresh_token);
                }
            });
    }
}

function generateCommonHeaders(): Headers {
    return new Headers({
        // Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
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
