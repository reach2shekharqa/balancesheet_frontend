import { useEffect, useState } from "react";
import "./App.css";

import AssetsBreakdownChart from "./components/AssetsBreakdownChart";
import AssetsComparisonChart from "./components/AssetsComparisonChart";
import LiabilitiesBreakdownChart from "./components/LiabilitiesBreakdownChart";
import { getValidYears } from "./utils/analyticsData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...options.headers,
        },
    });
    const result = await response.json();

    if (!response.ok) {
        const error = new Error(result.error || "Request failed.");
        error.status = response.status;
        throw error;
    }

    return result;
}

function LoadingIndicator({ label }) {
    return (
        <span className="loading-indicator" role="status">
            <span className="spinner" aria-hidden="true" />
            {label}
        </span>
    );
}

async function requestAnalytics(documentId, analyticsType) {
    console.log(`[ANALYTICS] Starting ${analyticsType} request`, {
        documentId,
        analyticsType,
    });

    const result = await requestJson(
        `/documents/${documentId}/analytics`,
        {
            method: "POST",
            body: JSON.stringify({ analyticsType }),
        }
    );

    console.log(`[ANALYTICS] ${analyticsType} response`, {
        ok: true,
        result,
    });

    return result;
}


function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState({ userName: "", email: "", password: "" });
    const [authMessage, setAuthMessage] = useState("");
    const [authSubmitting, setAuthSubmitting] = useState(false);
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState({ assets: false, liabilities: false });
    const [analyticsData, setAnalyticsData] = useState({
        assets: null,
        liabilities: null,
    });
    const [activeChart, setActiveChart] = useState("comparison");

    useEffect(() => {
        requestJson("/auth/me")
            .then(result => {
                setAuthError("");
                setUser(result.user);
            })
            .catch(error => {
                if (error.status === 401) {
                    setUser(null);
                    return;
                }

                setAuthError("We could not check your session. Please refresh and try again.");
            })
            .finally(() => setAuthLoading(false));
    }, []);

    function updateAuthField(event) {
        setAuthForm(current => ({ ...current, [event.target.name]: event.target.value }));
    }

    async function handleAuthSubmit(event) {
        event.preventDefault();
        if (authSubmitting) {
            return;
        }

        setAuthMessage("");
        setAuthSubmitting(true);

        try {
            const result = await requestJson(`/auth/${authMode}`, {
                method: "POST",
                body: JSON.stringify(authForm),
            });
            setUser(result.user);
            setAuthForm({ userName: "", email: "", password: "" });
        } catch (error) {
            setAuthMessage(error.message);
        } finally {
            setAuthSubmitting(false);
        }
    }

    async function handleLogout() {
        await requestJson("/auth/logout", { method: "POST" });
        setUser(null);
        setFile(null);
        setAnalyticsData({ assets: null, liabilities: null });
    }

    if (authLoading) {
        return <div className="app auth-loading"><div className="card loading-card"><LoadingIndicator label="Loading your session..." /></div></div>;
    }

    if (authError) {
        return <div className="app auth-loading"><div className="card loading-card"><div className="status-banner error">{authError}</div></div></div>;
    }

    if (!user) {
        return (
            <div className="app auth-app">
                <div className="card auth-card">
                    <h1>Financial Analyzer</h1>
                    <p>{authMode === "login" ? "Sign in to analyze your financial documents." : "Create an account to get started."}</p>
                    <form onSubmit={handleAuthSubmit} className="auth-form">
                        {authMode === "register" && (
                            <label>
                                Name
                                <input name="userName" value={authForm.userName} onChange={updateAuthField} required minLength="2" />
                            </label>
                        )}
                        <label>
                            Email
                            <input name="email" type="email" value={authForm.email} onChange={updateAuthField} required autoComplete="email" />
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" value={authForm.password} onChange={updateAuthField} required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                        </label>
                        <button type="submit" disabled={authSubmitting}>
                            {authSubmitting ? (
                                <LoadingIndicator label={authMode === "login" ? "Logging in..." : "Creating account..."} />
                            ) : authMode === "login" ? "Login" : "Register"}
                        </button>
                    </form>
                    {authMessage && <div className="status-banner">{authMessage}</div>}
                    <button className="secondary-button" disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>
                        {authMode === "login" ? "Create an account" : "Back to login"}
                    </button>
                </div>
            </div>
        );
    }


    function handleFileChange(event) {
        const selectedFile = event.target.files[0];

        setFile(selectedFile || null);
        setMessage("");
        setAnalyticsData({ assets: null, liabilities: null });
        setActiveChart("comparison");
    }

    async function handleUpload() {
        if (!file) {
            setMessage("Please select a PDF first.");
            return;
        }

        setUploading(true);
        setAnalyticsLoading({ assets: false, liabilities: false });
        setAnalyticsData({ assets: null, liabilities: null });
        setActiveChart("comparison");
        setMessage("Uploading PDF...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch(`${API_BASE_URL}/documents/upload`, {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            const uploadResult = await uploadResponse.json();
            console.log("Upload Result:", uploadResult);
            if (!uploadResponse.ok) {
                throw new Error(uploadResult.error || "Upload failed.");
            }

            const nextDocumentId = uploadResult?.document?.id ?? uploadResult?.id ?? null;

            if (!nextDocumentId) {
                throw new Error("Upload succeeded but no document ID was returned.");
            }

            setMessage("Processing document...");

            setAnalyticsLoading({ assets: true, liabilities: false });
            const analyticsResult = await requestAnalytics(
                nextDocumentId,
                "assetsBreakdown"
            );

            setAnalyticsLoading({ assets: false, liabilities: true });
            const liabilitiesResult = await requestAnalytics(
                nextDocumentId,
                "liabilitiesBreakdown"
            );

            setAnalyticsData({
                assets: analyticsResult,
                liabilities: liabilitiesResult,
            });
            setMessage("Balance sheet analytics loaded successfully.");
        } catch (error) {
            console.error("Upload / analytics error:", error);
            setMessage("Unable to load balance sheet analytics. Please try again.");
        } finally {
            setUploading(false);
            setAnalyticsLoading({ assets: false, liabilities: false });
        }
    }

    return (
        <div className="app">
            <div className="card">
                <div className="app-header">
                    <div>
                        <h1>Financial Analyzer</h1>
                        <p>Upload a financial PDF to analyze it.</p>
                    </div>
                    <div className="account-controls">
                        <span>{user.userName} ({user.email})</span>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                </div>

                <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                />

                {file && (
                    <div className="selected-file">
                        Selected file:
                        <strong>{file.name}</strong>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                >
                    {uploading ? <LoadingIndicator label="Uploading PDF..." /> : "Upload PDF"}
                </button>

                {message && (
                    <div className={`status-banner ${uploading ? "loading" : "info"}`}>
                        {message}
                    </div>
                )}

                {(analyticsData.assets || analyticsLoading.assets || analyticsLoading.liabilities) && (
                    <div className="analytics analytics-hero">
                        <div className="analytics-hero-copy">
                            <span className="analytics-eyebrow">Balance Sheet Insights</span>
                            <h2>Assets at a glance</h2>
                            <p>Explore the balance sheet one view at a time.</p>
                        </div>

                        <div className="analytics-switcher" role="tablist" aria-label="Financial analytics views">
                            <button
                                className={activeChart === "comparison" ? "is-active" : ""}
                                onClick={() => setActiveChart("comparison")}
                                role="tab"
                                aria-selected={activeChart === "comparison"}
                            >
                                {getValidYears(analyticsData.assets).slice(0, 2).join(" vs ") || "Comparison"}
                            </button>
                            <button
                                className={activeChart === "breakdown" ? "is-active" : ""}
                                onClick={() => setActiveChart("breakdown")}
                                role="tab"
                                aria-selected={activeChart === "breakdown"}
                            >
                                {getValidYears(analyticsData.assets)[0] || "Latest"} Breakdown
                            </button>
                            <button
                                className={activeChart === "liabilities" ? "is-active" : ""}
                                onClick={() => setActiveChart("liabilities")}
                                role="tab"
                                aria-selected={activeChart === "liabilities"}
                            >
                                Liabilities {getValidYears(analyticsData.liabilities)[0] || "Latest"}
                            </button>
                        </div>

                        <div className="analytics-hero-stage">
                            <section className="chart-panel chart-panel-featured">
                                {activeChart === "comparison" ? (
                                    analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsComparisonChart analyticsData={analyticsData.assets} />
                                ) : activeChart === "breakdown" ? (
                                    analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsBreakdownChart analyticsData={analyticsData.assets} />
                                ) : (
                                    analyticsLoading.liabilities ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <LiabilitiesBreakdownChart analyticsData={analyticsData.liabilities} />
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;

