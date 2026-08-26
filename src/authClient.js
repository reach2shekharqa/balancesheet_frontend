const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "financial_analyzer_auth_token";

export function getAuthToken() {
    try {
        return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function setAuthToken(token) {
    try {
        if (token) {
            window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        } else {
            window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        }
    } catch {
        return;
    }
}

export async function requestJson(path, options = {}) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    const result = await response.json();

    if (!response.ok) {
        const error = new Error(result.error || "Request failed.");
        error.status = response.status;
        Object.assign(error, result);
        throw error;
    }

    return result;
}