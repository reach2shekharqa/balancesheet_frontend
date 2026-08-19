import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import AssetsBreakdownChart from "./components/AssetsBreakdownChart";
import AssetsComparisonChart from "./components/AssetsComparisonChart";
import LiabilitiesBreakdownChart from "./components/LiabilitiesBreakdownChart";
import { getValidYears } from "./utils/analyticsData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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

function formatMarketNumber(value, suffix = "") {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)}${suffix}` : "--";
}

function MarketTicker() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        requestJson("/market/trending")
            .then(result => {
                if (!cancelled) setStocks(result.stocks ?? []);
            })
            .catch(() => {
                if (!cancelled) setStocks([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading || stocks.length === 0) {
        return null;
    }

    return (
        <section className="market-ticker" aria-label="Trending stocks">
            <div className="market-ticker-track">
                {[...stocks, ...stocks].map((stock, index) => {
                    const isPositive = Number(stock.changePercent) >= 0;
                    return (
                        <div className="market-ticker-item" key={`${stock.symbol}-${index}`}>
                            <strong>{stock.name || stock.symbol}</strong>
                            {stock.symbol && stock.name && <small>{stock.symbol}</small>}
                            <span>{formatMarketNumber(stock.price)}</span>
                            <em className={isPositive ? "is-positive" : "is-negative"}>
                                {isPositive ? "+" : ""}{formatMarketNumber(stock.changePercent, "%")}
                            </em>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function formatFileSize(bytes) {
    if (!bytes) return "PDF document";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
    const [reportMenuOpen, setReportMenuOpen] = useState(false);
    const [reportHistoryOpen, setReportHistoryOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const analyticsRequestRef = useRef(0);
    const googleButtonRef = useRef(null);

    useEffect(() => {
        requestJson("/auth/me")
            .then(result => {
                setAuthError("");
                setDocumentsLoading(true);
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
            setDocumentsLoading(true);
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
        setAuthMode("login");
        setAuthForm({ userName: "", email: "", password: "" });
        setAuthMessage("");
        setFile(null);
        setDocuments([]);
        setActiveDocumentId(null);
        setAnalyticsData({ assets: null, liabilities: null });
    }

    const handleGoogleLogin = useCallback(async credential => {
        if (!credential || authSubmitting) {
            return;
        }

        setAuthMessage("");
        setAuthSubmitting(true);

        try {
            const result = await requestJson("/auth/google", {
                method: "POST",
                body: JSON.stringify({ credential }),
            });
            setDocumentsLoading(true);
            setUser(result.user);
            setAuthForm({ userName: "", email: "", password: "" });
        } catch (error) {
            setAuthMessage(error.message);
        } finally {
            setAuthSubmitting(false);
        }
    }, [authSubmitting]);

    useEffect(() => {
        if (user || !GOOGLE_CLIENT_ID || !googleButtonRef.current) {
            return;
        }

        const renderGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleButtonRef.current) {
                return false;
            }

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: response => handleGoogleLogin(response.credential),
            });
            googleButtonRef.current.replaceChildren();
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                theme: "outline",
                size: "large",
                width: 350,
                text: authMode === "login" ? "signin_with" : "signup_with",
                shape: "rectangular",
            });
            return true;
        };

        if (renderGoogleButton()) {
            return;
        }

        const renderInterval = window.setInterval(() => {
            if (renderGoogleButton()) {
                window.clearInterval(renderInterval);
            }
        }, 100);

        return () => window.clearInterval(renderInterval);
    }, [authLoading, authMode, handleGoogleLogin, user]);

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
                    <div className="auth-panel-content">
                        <div className="auth-card">
                        <span className="eyebrow">{authMode === "login" ? "Welcome back" : "Join Financial Analyzer"}</span>
                        <h2>{authMode === "login" ? "Sign in to your workspace" : "Create your workspace"}</h2>
                        <p>{authMode === "login" ? "Access your financial analysis dashboard." : "Start turning reports into useful insight."}</p>
                    <form onSubmit={handleAuthSubmit} className="auth-form">
                        {authMode === "register" && (
                            <label>
                                Name
                                <input name="userName" type="text" value={authForm.userName} onChange={updateAuthField} required autoComplete="name" />
                            </label>
                        )}
                        <label>
                            {authMode === "login" ? "Email or username" : "Email"}
                            <input name="email" type={authMode === "login" ? "text" : "email"} value={authForm.email} onChange={updateAuthField} required autoComplete={authMode === "login" ? "username" : "email"} />
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" value={authForm.password} onChange={updateAuthField} required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                        </label>
                        <button className="primary-button" type="submit" disabled={authSubmitting}>
                            {authSubmitting ? (
                                <LoadingIndicator label={authMode === "login" ? "Logging in..." : "Creating account..."} />
                            ) : authMode === "login" ? "Login" : "Create account"}
                        </button>
                    </form>
                    {GOOGLE_CLIENT_ID && <>
                        <div className="auth-divider"><span>or continue with</span></div>
                        <div className="google-login-button" ref={googleButtonRef} />
                    </>}
                    {authMessage && <div className="status-banner error">{authMessage}</div>}
                    <button type="button" className="secondary-button" disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>
                        {authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
                    </button>
                        </div>
                        <MarketTicker />
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

    function focusAnalytics() {
        const analyticsSection = document.getElementById("analytics");

        analyticsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        analyticsSection?.focus({ preventScroll: true });
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
            focusAnalytics();
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

    const latestReport = documents[0];
    const analyticsReady = analyticsData.assets && analyticsData.liabilities;
    const analyticsBusy = analyticsLoading.assets || analyticsLoading.liabilities;

    return (
        <div className="app workspace-app">
            {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
            {mobileNavOpen && <nav className="mobile-nav-drawer" aria-label="Mobile navigation"><div className="mobile-drawer-head"><strong>Financial Analyzer</strong><button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">Close</button></div><a href="#dashboard" onClick={() => setMobileNavOpen(false)}>Dashboard</a><a href="#documents" onClick={() => setMobileNavOpen(false)}>Documents</a><a href="#analytics" onClick={() => setMobileNavOpen(false)}>Analytics</a><button className="mobile-report-toggle" onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen}>Report history <span aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>{reportHistoryOpen && <div className="mobile-report-history">{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p></div> : <div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { handleDocumentSelect(document.id); setMobileNavOpen(false); }}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div>}</div>}</nav>}
            <aside className="sidebar">
                <div className="brand-lockup"><span className="brand-mark">FA</span><strong>Financial<br />Analyzer</strong></div>
                <div className="sidebar-label">Workspace</div>
                <nav className="main-nav" aria-label="Main navigation">
                    <a className="nav-item is-active" href="#dashboard"><NavIcon>+</NavIcon>Dashboard</a>
                    <a className="nav-item" href="#documents"><NavIcon>[]</NavIcon>Documents</a>
                    <a className="nav-item" href="#analytics"><NavIcon>~</NavIcon>Analytics</a>
                    <button id="documents" className={`nav-item nav-button report-history-toggle ${reportHistoryOpen ? "is-open" : ""}`} onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen} aria-controls="sidebar-report-history"><NavIcon>{reportHistoryOpen ? "-" : "+"}</NavIcon>Report history<span className="nav-chevron" aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>
                    {reportHistoryOpen && <div className="sidebar-report-history" id="sidebar-report-history"><div className="history-heading"><div><span className="eyebrow">Report history</span><h3>Reports</h3></div><span className="history-count">{documents.length}</span></div>{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p><a href="#upload">Upload PDF</a></div> : <><button className={`report-selector ${reportMenuOpen ? "is-open" : ""}`} onClick={() => setReportMenuOpen(open => !open)} aria-expanded={reportMenuOpen} disabled={documentsLoading}><span>{documents.find(document => document.id === activeDocumentId)?.original_filename || "Select report"}</span><span aria-hidden="true">⌄</span></button>{reportMenuOpen && <div className="report-menu"><span className="report-menu-label">Select report</span>{documents.map((document, index) => <button className={`report-option ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { setReportMenuOpen(false); handleDocumentSelect(document.id); }}><span>{document.id === activeDocumentId ? "✓" : ""}</span><span className="report-option-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}{document.extraction_status ? ` · ${document.extraction_status}` : ""}</small></span>{index === 0 && <em>Latest</em>}</button>)}</div>}<div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => handleDocumentSelect(document.id)}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div></>}</div>}
                </nav>
                <div className="sidebar-footer"><div className="sidebar-label">Account</div><button className="nav-item nav-button" onClick={handleLogout}><NavIcon>&gt;</NavIcon>Log out</button></div>
            </aside>
            <main className="workspace-main">
                <header className="topbar">
                    <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" aria-expanded={mobileNavOpen}>Menu</button>
                    <div><span className="topbar-kicker">Workspace / Overview</span><h1>Dashboard</h1></div>
                    <div className="topbar-actions">
                        <div className="account-controls"><div className="avatar">{String(user.userName || "U").slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user.userName}</strong><span>{user.email}</span></div><button onClick={handleLogout} className="logout-button">Log out</button></div>
                    </div>
                </header>
                <div className="content-grid" id="dashboard">
                    <section className="welcome-panel">
                        <div><span className="eyebrow">Financial intelligence</span><h2>Your numbers, in focus.</h2><p>Upload a financial report to generate a clear balance sheet view.</p></div>
                        <div className="welcome-mark" aria-hidden="true"><span>+12.8%</span><i /></div>
                    </section>
                    <section className="kpi-grid" aria-label="Workspace summary">
                        <div className="kpi-card"><span className="kpi-label">Reports analyzed</span><strong>{documents.length}</strong><span className="kpi-foot">In this session</span></div>
                        <div className="kpi-card"><span className="kpi-label">Analytics status</span><strong className={analyticsReady ? "status-positive" : ""}>{analyticsReady ? "Ready" : uploading || analyticsBusy ? "Processing" : "Waiting"}</strong><span className="kpi-foot">Balance sheet insights</span></div>
                        <div className="kpi-card"><span className="kpi-label">Latest report</span><strong title={latestReport?.original_filename}>{latestReport?.original_filename || "--"}</strong><span className="kpi-foot">PDF document</span></div>
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
                    <section className="insights-section" id="analytics" tabIndex="-1">
                        <SectionHeader eyebrow="Financial intelligence" title="Balance Sheet Insights" description="Financial position and asset composition from your reports." />
                        <div className="insights-workspace" id="insights-content">
                            <div className="insight-workspace-main">
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
                        </section></> : <div className="insights-skeleton"><LoadingIndicator label={documentsLoading ? "Loading reports..." : "Loading insights..."} /><span /></div>}
                            </div>
                        </div>
                    </section>
                </div>
                <footer className="workspace-footer">Financial Analyzer <span>Private workspace</span></footer>
            </main>
        </div>
    );
}

export default App;

