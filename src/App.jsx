import { useEffect, useRef, useState } from "react";
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

function formatFileSize(bytes) {
    if (!bytes) return "PDF document";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentDate(value) {
    if (!value) return "Date unavailable";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
}

function documentStatusLabel(status) {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
}

function NavIcon({ children }) {
    return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

function SectionHeader({ eyebrow, title, description, action }) {
    return (
        <div className="section-header">
            <div>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                <h2>{title}</h2>
                {description && <p>{description}</p>}
            </div>
            {action}
        </div>
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
    const [documents, setDocuments] = useState([]);
    const [activeDocumentId, setActiveDocumentId] = useState(null);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [activeChart, setActiveChart] = useState("comparison");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const analyticsRequestRef = useRef(0);

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

        async function loadAnalytics(documentId) {
            const requestId = analyticsRequestRef.current + 1;
            analyticsRequestRef.current = requestId;
            setAnalyticsLoading({ assets: true, liabilities: true });
            setAnalyticsData({ assets: null, liabilities: null });

            try {
                const [assets, liabilities] = await Promise.all([
                    requestAnalytics(documentId, "assetsBreakdown"),
                    requestAnalytics(documentId, "liabilitiesBreakdown"),
                ]);

                if (requestId === analyticsRequestRef.current) {
                    setAnalyticsData({ assets, liabilities });
                }
            } finally {
                if (requestId === analyticsRequestRef.current) {
                    setAnalyticsLoading({ assets: false, liabilities: false });
                }
            }
        }

        useEffect(() => {
            if (!user) {
                return;
            }

            let cancelled = false;

            requestJson("/documents")
                .then(result => {
                    if (cancelled) return;

                    const nextDocuments = result.documents ?? [];
                    setDocuments(nextDocuments);

                    const latestDocument = nextDocuments[0];
                    if (latestDocument) {
                        setActiveDocumentId(latestDocument.id);
                        loadAnalytics(latestDocument.id).catch(error => {
                            if (!cancelled) {
                                setMessage(error.message);
                            }
                        });
                    } else {
                        setActiveDocumentId(null);
                        setAnalyticsData({ assets: null, liabilities: null });
                    }
                })
                .catch(error => {
                    if (!cancelled) setMessage(error.message);
                })
                .finally(() => {
                    if (!cancelled) setDocumentsLoading(false);
                });

            return () => {
                cancelled = true;
            };
        }, [user]);

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
        setDocuments([]);
        setActiveDocumentId(null);
        setAnalyticsData({ assets: null, liabilities: null });
    }

    if (authLoading) {
        return <div className="app auth-loading"><div className="loading-card"><div className="brand-mark">FA</div><LoadingIndicator label="Loading your workspace..." /></div></div>;
    }

    if (authError) {
        return <div className="app auth-loading"><div className="loading-card"><div className="status-banner error">{authError}</div></div></div>;
    }

    if (!user) {
        return (
            <div className="app auth-app">
                <div className="auth-visual">
                    <div className="brand-lockup"><span className="brand-mark">FA</span><strong>Financial Analyzer</strong></div>
                    <div className="auth-visual-copy"><span className="eyebrow">Financial intelligence</span><h1>Clarity for every number.</h1><p>Turn financial reports into decisions with a focused workspace for analysis.</p></div>
                    <div className="auth-signal"><span className="signal-dot" /> Secure document analysis</div>
                </div>
                <div className="auth-panel">
                    <div className="auth-card">
                        <span className="eyebrow">Welcome back</span>
                        <h2>{authMode === "login" ? "Sign in to your workspace" : "Create your workspace"}</h2>
                        <p>{authMode === "login" ? "Access your financial analysis dashboard." : "Start turning reports into useful insight."}</p>
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
                        <button className="primary-button" type="submit" disabled={authSubmitting}>
                            {authSubmitting ? (
                                <LoadingIndicator label={authMode === "login" ? "Logging in..." : "Creating account..."} />
                            ) : authMode === "login" ? "Login" : "Register"}
                        </button>
                    </form>
                    {authMessage && <div className="status-banner error">{authMessage}</div>}
                    <button className="secondary-button" disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>
                        {authMode === "login" ? "Create an account" : "Back to login"}
                    </button>
                    </div>
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

            setActiveDocumentId(nextDocumentId);
            await loadAnalytics(nextDocumentId);
            const documentsResult = await requestJson("/documents");
            setDocuments(documentsResult.documents ?? []);
            setMessage("Balance sheet analytics loaded successfully.");
        } catch (error) {
            console.error("Upload / analytics error:", error);
            setMessage("Unable to load balance sheet analytics. Please try again.");
        } finally {
            setUploading(false);
            setAnalyticsLoading({ assets: false, liabilities: false });
        }
    }

    async function handleDocumentSelect(documentId) {
        if (documentId === activeDocumentId) return;

        setActiveDocumentId(documentId);
        setMessage("");

        try {
            await loadAnalytics(documentId);
        } catch (error) {
            setMessage(`Unable to load this document's analytics: ${error.message}`);
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        if (!uploading) {
            const droppedFile = event.dataTransfer.files[0];
            if (droppedFile?.type === "application/pdf") {
                setFile(droppedFile);
                setMessage("");
                setAnalyticsData({ assets: null, liabilities: null });
            } else if (droppedFile) {
                setMessage("Please choose a PDF financial report.");
            }
        }
    }

    return (
        <div className="app workspace-app">
            {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
            {mobileNavOpen && <nav className="mobile-nav-drawer" aria-label="Mobile navigation"><div className="mobile-drawer-head"><strong>Financial Analyzer</strong><button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">Close</button></div><a href="#dashboard" onClick={() => setMobileNavOpen(false)}>Dashboard</a><a href="#documents" onClick={() => setMobileNavOpen(false)}>Documents</a><a href="#analytics" onClick={() => setMobileNavOpen(false)}>Analytics</a></nav>}
            <aside className="sidebar">
                <div className="brand-lockup"><span className="brand-mark">FA</span><strong>Financial<br />Analyzer</strong></div>
                <div className="sidebar-label">Workspace</div>
                <nav className="main-nav" aria-label="Main navigation">
                    <a className="nav-item is-active" href="#dashboard"><NavIcon>+</NavIcon>Dashboard</a>
                    <a className="nav-item" href="#documents"><NavIcon>[]</NavIcon>Documents</a>
                    <a className="nav-item" href="#analytics"><NavIcon>~</NavIcon>Analytics</a>
                </nav>
                <div className="sidebar-footer"><div className="sidebar-label">Account</div><button className="nav-item nav-button" onClick={handleLogout}><NavIcon>&gt;</NavIcon>Log out</button></div>
            </aside>
            <main className="workspace-main">
                <header className="topbar">
                    <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" aria-expanded={mobileNavOpen}>Menu</button>
                    <div><span className="topbar-kicker">Workspace / Overview</span><h1>Dashboard</h1></div>
                    <div className="account-controls"><div className="avatar">{String(user.userName || "U").slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user.userName}</strong><span>{user.email}</span></div><button onClick={handleLogout} className="logout-button">Log out</button></div>
                </header>
                <div className="content-grid" id="dashboard">
                    <section className="welcome-panel">
                        <div><span className="eyebrow">Financial intelligence</span><h2>Your numbers, in focus.</h2><p>Upload a financial report to generate a clear balance sheet view.</p></div>
                        <div className="welcome-mark" aria-hidden="true"><span>+12.8%</span><i /></div>
                    </section>
                    <section className="kpi-grid" aria-label="Workspace summary">
                        <div className="kpi-card"><span className="kpi-label">Reports analyzed</span><strong>{file ? "1" : "0"}</strong><span className="kpi-foot">In this session</span></div>
                        <div className="kpi-card"><span className="kpi-label">Analytics status</span><strong className={analyticsData.assets ? "status-positive" : ""}>{analyticsData.assets ? "Ready" : uploading ? "Processing" : "Waiting"}</strong><span className="kpi-foot">Balance sheet insights</span></div>
                        <div className="kpi-card"><span className="kpi-label">Latest report</span><strong>{file ? formatFileSize(file.size) : "--"}</strong><span className="kpi-foot">PDF document</span></div>
                    </section>
                    <section className="upload-section" id="upload">
                        <SectionHeader eyebrow="Get started" title="Upload a financial report" description="Drop a PDF here to unlock your balance sheet analytics." />
                        <div className={`upload-zone ${file ? "has-file" : ""}`} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
                            <input id="file-upload" className="file-input" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} disabled={uploading} />
                            <label htmlFor="file-upload" className="upload-zone-content"><span className="upload-icon">↑</span><strong>{file ? file.name : "Drop your report here"}</strong><span>{file ? `${formatFileSize(file.size)} · PDF selected` : "or browse from your device"}</span><small>PDF files up to 25 MB</small></label>
                        </div>
                        <div className="upload-actions"><button className="primary-button upload-button" onClick={handleUpload} disabled={!file || uploading}>{uploading ? <LoadingIndicator label="Processing report..." /> : "Analyze report"}</button>{file && <span className="file-status"><span className="status-dot" /> Ready to analyze</span>}</div>
                        {message && <div className={`status-banner ${uploading ? "loading" : message.includes("Unable") || message.includes("Please") ? "error" : "success"}`}><strong>{uploading ? "Processing report" : message.includes("Unable") ? "Analysis could not be completed" : "Report update"}</strong><span>{message}</span></div>}
                    </section>
                    <section className="documents-section" id="documents">
                        <SectionHeader eyebrow="Document history" title="My documents" description="Every report stays available for review." />
                        {documentsLoading ? <div className="document-list-loading"><LoadingIndicator label="Loading documents..." /></div> : documents.length === 0 ? <div className="empty-state"><strong>No documents yet</strong><p>Upload your first financial report to begin.</p></div> : <>
                            <div className="current-document"><span className="eyebrow">Currently selected</span><strong>{documents.find(document => document.id === activeDocumentId)?.original_filename}</strong></div>
                            <div className="document-list" aria-label="My documents">
                                {documents.map((document, index) => <button key={document.id} className={`document-row ${document.id === activeDocumentId ? "is-selected" : ""}`} onClick={() => handleDocumentSelect(document.id)} aria-pressed={document.id === activeDocumentId}>
                                    <span className="document-row-main"><strong>{document.original_filename}</strong><span>Uploaded {formatDocumentDate(document.linked_at || document.uploaded_at)} · {documentStatusLabel(document.extraction_status)}</span></span>
                                    <span className="document-row-badges">{index === 0 && <em>Latest</em>}{document.id === activeDocumentId && <small>Selected</small>}</span>
                                </button>)}
                            </div>
                        </>}
                    </section>
                    <section className="analytics-section" id="analytics">
                        <SectionHeader eyebrow="Insights" title="Balance sheet analytics" description="Explore the financial story in your selected report." />
                        {(analyticsData.assets || analyticsLoading.assets || analyticsLoading.liabilities) ? <>
                        <div className="analytics-tabs" role="tablist" aria-label="Financial analytics views">
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
                        </div><section className="chart-panel chart-panel-featured">
                                {activeChart === "comparison" ? (
                                    analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsComparisonChart analyticsData={analyticsData.assets} />
                                ) : activeChart === "breakdown" ? (
                                    analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsBreakdownChart analyticsData={analyticsData.assets} />
                                ) : (
                                    analyticsLoading.liabilities ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <LiabilitiesBreakdownChart analyticsData={analyticsData.liabilities} />
                                )}
                        </section></> : <div className="empty-state"><div className="empty-icon">/</div><strong>Your insights will appear here</strong><p>Upload a report above to see assets, liabilities, and year-over-year comparisons.</p></div>}
                    </section>
                </div>
                <footer className="workspace-footer">Financial Analyzer <span>Private workspace</span></footer>
            </main>
        </div>
    );
}

export default App;

