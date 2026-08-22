import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import AssetsBreakdownChart from "./components/AssetsBreakdownChart";
import AssetsComparisonChart from "./components/AssetsComparisonChart";
import LiabilitiesBreakdownChart from "./components/LiabilitiesBreakdownChart";
import { getValidYears } from "./utils/analyticsData";
import ProfitLossComparisonChart from "./components/ProfitLossComparisonChart";
import ProfitLossExpensesChart from "./components/ProfitLossExpensesChart";
import KeyMetricsGrid from "./components/keyMetrics/KeyMetricsGrid";
import AdminDashboard from "./AdminDashboard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const welcomeImageSeed = Math.floor(Math.random() * 100000);

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
        Object.assign(error, result);
        throw error;
    }

    return result;
}

function LoadingIndicator({ label }) {
    return (
        <span className="loading-indicator" role="status">
            <span className="spinner" aria-hidden="true"><span>₹</span></span>
            {label}
        </span>
    );
}

function formatFileSize(bytes) {
    if (!bytes) return "PDF document";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLocalTimeZoneLabel() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const city = timeZone.split("/").pop()?.replaceAll("_", " ");
    return city || "your local time";
}

function getWelcomeImageUrl(dayPart) {
    const location = getLocalTimeZoneLabel();
    const imageSets = {
        morning: ["1497366754035-f200968a6e72", "1497366811353-6870744d04b2"],
        afternoon: ["1497366216548-37526070297c", "1497366811353-6870744d04b2"],
        evening: ["1497366811353-6870744d04b2", "1497366216548-37526070297c"],
        night: ["1519681393784-d120267933ba", "1519608487953-e999c86e7455"],
    };
    const locationValue = [...location].reduce((total, character) => total + character.charCodeAt(0), 0);
    const images = imageSets[dayPart];
    const imageId = images[(locationValue + welcomeImageSeed) % images.length];
    return `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=1400&q=85&sig=${welcomeImageSeed}`;
}

function getWelcomeImageSources(dayPart) {
    const location = getLocalTimeZoneLabel();
    const query = encodeURIComponent(`${location} ${dayPart} finance office`);
    return [
        getWelcomeImageUrl(dayPart),
        `https://source.unsplash.com/1400x500/?${query}&sig=${welcomeImageSeed}`,
        `https://loremflickr.com/1400/500/${query}?lock=${welcomeImageSeed}-${dayPart}`,
    ];
}

function getDayPart(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
}

const landingSteps = [
    {
        number: "01",
        title: "Upload",
        description: "Upload your financial report or PDF to start the review.",
    },
    {
        number: "02",
        title: "Analyse",
        description: "AI extracts and analyses the financial statements automatically.",
    },
    {
        number: "03",
        title: "Understand",
        description: "Get metrics, comparisons and actionable insights in plain language.",
    },
];

function LandingPage({ onGetStarted }) {
    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="landing-shell landing-nav">
                    <div className="brand-lockup">
                        <span className="brand-mark">₹</span>
                        <strong>Financial Analyzer</strong>
                    </div>
                    <nav className="landing-nav-links" aria-label="Main navigation">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#benefits">Benefits</a>
                    </nav>
                    <button className="primary-button landing-nav-button landing-gold-cta" type="button" onClick={onGetStarted}>
                        Get Started
                    </button>
                </div>
            </header>

            <main className="landing-shell landing-main">
                <section className="landing-hero">
                    <div className="landing-hero-copy">
                        <span className="eyebrow landing-eyebrow">AI-powered financial analysis</span>
                        <h1>Turn Financial Reports Into Clear Business Insights</h1>
                        <p>
                            Upload your financial statements and instantly understand revenue, profitability,
                            cash flow, balance sheet health, trends and key financial insights.
                        </p>
                        <div className="landing-hero-actions">
                            <button className="primary-button landing-gold-cta" type="button" onClick={onGetStarted}>
                                Get Started
                            </button>
                        </div>
                        <div className="landing-trust-row" aria-label="Product highlights">
                            <span>
                                <strong>2x</strong> faster analysis
                            </span>
                            <span>
                                <strong>24/7</strong> insight support
                            </span>
                            <span>
                                <strong>PDF</strong> upload ready
                            </span>
                        </div>
                    </div>

                    <div className="landing-hero-visual">
                        <section className="landing-features landing-video-section" id="features" aria-label="Product preview">
                            <video
                                className="landing-feature-video"
                                src="https://cdn.dribbble.com/userupload/15158653/file/original-6770ea165a041444c094cf60b32ccc80.mp4"
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                onCanPlay={(event) => event.currentTarget.play().catch(() => {})}
                                onPause={(event) => event.currentTarget.play().catch(() => {})}
                                onTimeUpdate={(event) => {
                                    if (event.currentTarget.currentTime >= 2) {
                                        event.currentTarget.currentTime = 0;
                                    }
                                }}
                                aria-label="Financial analyzer product preview"
                            />
                        </section>
                    </div>

                </section>

                <section className="landing-steps" id="how-it-works">
                    <div className="section-header landing-section-header">
                        <div>
                            <span className="eyebrow">How it works</span>
                            <h2>From raw statements to clear business understanding</h2>
                        </div>
                    </div>
                    <div className="steps-grid">
                        {landingSteps.map((step) => (
                            <article className="step-card" key={step.number}>
                                <span className="step-number">{step.number}</span>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-benefits" id="benefits">
                    <div className="benefit-panel">
                        <div className="benefit-copy">
                            <span className="eyebrow">Why teams use it</span>
                            <h2>See trends, risks and opportunities in one place</h2>
                            <p>
                                Turn financial statements into focused insight for performance reviews,
                                planning conversations, and faster decision-making across the business.
                            </p>
                        </div>
                        <div className="benefit-points">
                            <div>
                                <strong>Operational clarity</strong>
                                <span>Understand revenue, cash movement and profitability without manual spreadsheet work.</span>
                            </div>
                            <div>
                                <strong>Faster reviews</strong>
                                <span>Surface the metrics and changes that matter most for financial planning.</span>
                            </div>
                            <div>
                                <strong>Actionable insight</strong>
                                <span>Support conversations with concise explanations and direct comparisons.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="landing-cta">
                    <div className="cta-panel">
                        <div>
                            <span className="eyebrow">Ready to get started?</span>
                            <h2>Ready to understand your financial reports?</h2>
                        </div>
                        <button className="primary-button landing-gold-cta" type="button" onClick={onGetStarted}>
                            Get Started
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
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

function UpgradeModal({ quota, onClose, onContact, onCheckout, checkoutLoading, checkoutError }) {
    const isTopPlan = quota?.plan === "PLAN_250";
    const nextPlan = quota?.plan === "FREE" ? "$99 Plan" : "$250 Plan";
    return (
        <>
            <div className="quota-modal-backdrop" onClick={onClose} aria-hidden="true" />
            <section className="quota-modal" role="dialog" aria-modal="true" aria-labelledby="quota-modal-title">
                <button className="contact-close" onClick={onClose} aria-label="Close upgrade dialog">×</button>
                <span className="quota-modal-mark" aria-hidden="true">↑</span>
                <span className="eyebrow">{isTopPlan ? "Workspace capacity" : "Plan upgrade"}</span>
                <h2 id="quota-modal-title">{isTopPlan ? "Upload limit reached" : quota?.plan === "FREE" ? "Upload limit reached" : "You've reached your limit"}</h2>
                <p>You've used all {quota?.uploadQuota} PDF uploads.</p>
                <div className="quota-usage"><div><strong>{quota?.uploadsUsed} / {quota?.uploadQuota}</strong><span>PDF uploads used</span></div><span className="quota-progress"><i style={{ width: "100%" }} /></span></div>
                {isTopPlan ? <><p>Please contact support to increase your upload capacity.</p><button className="primary-button" onClick={onContact}>Contact Support</button></> : <><p>Upgrade to the {nextPlan} to continue analyzing your financial documents.</p><div className="upgrade-offer"><div><strong>{nextPlan}</strong><span>{quota?.plan === "FREE" ? "25 PDF uploads" : "Up to 250 PDF uploads"}</span><span>More room for your reports</span></div><strong className="upgrade-price">{quota?.plan === "FREE" ? "$99" : "$250"}</strong></div><button className="primary-button quota-cta" onClick={onCheckout} disabled={checkoutLoading}>{checkoutLoading ? <LoadingIndicator label="Opening checkout..." /> : `Upgrade for ${quota?.plan === "FREE" ? "$99" : "$250"}`}</button>{checkoutError && <div className="quota-checkout-error" role="alert">{checkoutError}</div>}</>}
                <button className="secondary-button quota-dismiss" onClick={onClose}>{isTopPlan ? "Close" : "Maybe later"}</button>
            </section>
        </>
    );
}

const appDocs = [
    { title: "Getting started", text: "Sign in to your workspace, upload a PDF financial report, and choose Analyze report to begin document processing." },
    { title: "Uploading reports", text: "Use the upload area to select or drop a PDF. Reports up to 25 MB are supported. The latest report appears in your dashboard summary." },
    { title: "Explore your report", text: "Open Analytics to switch between balance sheet and profit and loss views. Use the chart tabs to compare periods, inspect breakdowns, and review liabilities." },
    { title: "Report history", text: "Open Report history from the sidebar to choose a previous report. Selecting a report refreshes the dashboard analytics for that document." },
    { title: "Account and privacy", text: "Use the account controls to sign out. Review the Privacy and Security information in the footer for guidance about workspace access and uploaded documents." },
];

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
    const [landingView, setLandingView] = useState("landing");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState({ assets: false, liabilities: false, profitLoss: false });
    const [analyticsData, setAnalyticsData] = useState({
        assets: null,
        liabilities: null,
        profitLoss: null,
    });
    const [documents, setDocuments] = useState([]);
    const [activeDocumentId, setActiveDocumentId] = useState(null);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [quota, setQuota] = useState(null);
    const [quotaModalOpen, setQuotaModalOpen] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState("");
    const [activeChart, setActiveChart] = useState("comparison");
    const [activeSection, setActiveSection] = useState(() => window.location.hash || "#dashboard");
    const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem("financial-theme") === "dark");
    const [contactOpen, setContactOpen] = useState(false);
    const [contactSent, setContactSent] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [securityOpen, setSecurityOpen] = useState(false);
    const [docsOpen, setDocsOpen] = useState(false);
    const [docsQuery, setDocsQuery] = useState("");
    const [cookiesOpen, setCookiesOpen] = useState(false);
    const [cookiePreferences, setCookiePreferences] = useState(() => {
        try {
            return JSON.parse(window.localStorage.getItem("financial-cookie-preferences")) || { analytics: false, social: false, advertising: false };
        } catch {
            return { analytics: false, social: false, advertising: false };
        }
    });
    const [reportMenuOpen, setReportMenuOpen] = useState(false);
    const [reportHistoryOpen, setReportHistoryOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const currentDayPart = getDayPart(currentTime.getHours());
    const [welcomeImageIndex, setWelcomeImageIndex] = useState(0);
    const analyticsRequestRef = useRef(0);
    const googleButtonRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageTimeoutRef = useRef(null);
    const googleInitializedRef = useRef(false);

    useEffect(() => {
        const handleHashChange = () => setActiveSection(window.location.hash || "#dashboard");
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    async function loadQuota() {
        const result = await requestJson("/documents/quota");
        setQuota(result);
        return result;
    }

    useEffect(() => {
        if (!user) return;
        const refreshQuota = async () => {
            try {
                await loadQuota();
            } catch {
                return;
            }
        };
        refreshQuota();
    }, [user]);

    useEffect(() => {
        const clock = window.setInterval(() => setCurrentTime(new Date()), 60 * 1000);
        return () => window.clearInterval(clock);
    }, []);

    useEffect(() => {
        const resetImage = window.setTimeout(() => setWelcomeImageIndex(0), 0);
        return () => window.clearTimeout(resetImage);
    }, [currentDayPart]);

    useEffect(() => {
        window.localStorage.setItem("financial-theme", darkMode ? "dark" : "light");
    }, [darkMode]);

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

    useEffect(() => {
        if (!authLoading && window.location.pathname.startsWith("/admin") && (!user || user.role !== "admin")) {
            window.location.replace("/");
        }
    }, [authLoading, user]);

        async function loadAnalytics(documentId) {
            const requestId = analyticsRequestRef.current + 1;
            analyticsRequestRef.current = requestId;
            setAnalyticsLoading({ assets: true, liabilities: true, profitLoss: true });
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });

            try {
                const [assets, liabilities, profitLoss] = await Promise.all([
                    requestAnalytics(documentId, "assetsBreakdown"),
                    requestAnalytics(documentId, "liabilitiesBreakdown"),
                    requestAnalytics(documentId, "profitLoss"),
                ]);

                if (requestId === analyticsRequestRef.current) {
                    setAnalyticsData({ assets, liabilities, profitLoss });
                }
            } finally {
                if (requestId === analyticsRequestRef.current) {
                    setAnalyticsLoading({ assets: false, liabilities: false, profitLoss: false });
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
                        setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
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

    const openAuthFlow = useCallback((mode = "login") => {
        setLandingView("auth");
        setAuthMode(mode);
        setAuthMessage("");
    }, []);

    async function handleLogout() {
        await requestJson("/auth/logout", { method: "POST" });
        setUser(null);
        setLandingView("landing");
        setAuthMode("login");
        setAuthForm({ userName: "", email: "", password: "" });
        setAuthMessage("");
        setFile(null);
        setDocuments([]);
        setActiveDocumentId(null);
        setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
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

    const handleGoogleFallback = useCallback(() => {
        if (!GOOGLE_CLIENT_ID || !googleInitializedRef.current || typeof window === "undefined" || !window.google?.accounts?.id) {
            setAuthMessage("Google sign-in is still loading. Please try again in a moment.");
            return;
        }

        window.google.accounts.id.prompt();
    }, []);

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
            googleInitializedRef.current = true;
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
    }, [authLoading, authMode, handleGoogleLogin, landingView, user]);

    if (authLoading) {
        return <div className="app auth-loading"><div className="loading-card"><div className="brand-mark">₹</div><LoadingIndicator label="Loading your workspace..." /></div></div>;
    }

    if (authError) {
        return <div className="app auth-loading"><div className="loading-card"><div className="status-banner error">{authError}</div></div></div>;
    }

    if (!user) {
        if (landingView === "landing") {
            return (
                <LandingPage
                    onGetStarted={() => openAuthFlow("register")}
                />
            );
        }

        return (
            <div className="app auth-app">
                <div className="auth-visual">
                    <div className="brand-lockup"><span className="brand-mark">₹</span><strong>Financial Analyzer</strong></div>
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
                        <div className="google-auth-tools">
                            <div className="google-login-button" ref={googleButtonRef} />
                            <button type="button" className="google-fallback-button" onClick={handleGoogleFallback}>
                                <span aria-hidden="true">G</span>
                                {authMode === "login" ? "Sign in with Google" : "Sign up with Google"}
                            </button>
                        </div>
                    </>}
                    {authMessage && <div className="status-banner error">{authMessage}</div>}
                    <button type="button" className="secondary-button" disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>
                        {authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
                    </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (window.location.pathname.startsWith("/admin")) {
        if (user.role !== "admin") {
            return <div className="app auth-loading"><div className="loading-card"><div className="status-banner error">Admin access required.</div></div></div>;
        }

        return <AdminDashboard user={user} onLogout={handleLogout} />;
    }


    function handleFileChange(event) {
        const selectedFile = event.target.files[0];

        setFile(selectedFile || null);
        setMessage("");
        if (!activeDocumentId) {
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
        }
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

        if (messageTimeoutRef.current) {
            window.clearTimeout(messageTimeoutRef.current);
            messageTimeoutRef.current = null;
        }
        setUploading(true);
        setAnalyticsLoading({ assets: false, liabilities: false, profitLoss: false });
        if (!activeDocumentId) {
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
        }
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
                const error = new Error(uploadResult.message || uploadResult.error || "Upload failed.");
                Object.assign(error, uploadResult);
                throw error;
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
            await loadQuota();
            setMessage("Balance sheet analytics loaded successfully.");
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            messageTimeoutRef.current = window.setTimeout(() => {
                setMessage("");
                messageTimeoutRef.current = null;
            }, 2500);
            focusAnalytics();
        } catch (error) {
            console.error("Upload / analytics error:", error);
            if (error.code === "UPLOAD_QUOTA_EXCEEDED") {
                setQuota({ plan: error.plan, uploadsUsed: error.uploadsUsed, uploadQuota: error.uploadQuota });
                setCheckoutError("");
                setQuotaModalOpen(true);
                setMessage("");
            } else {
                setMessage("Unable to load balance sheet analytics. Please try again.");
            }
        } finally {
            setUploading(false);
            setAnalyticsLoading({ assets: false, liabilities: false, profitLoss: false });
        }
    }

    async function handleCheckout() {
        setCheckoutLoading(true);
        setCheckoutError("");
        try {
            const result = await requestJson("/subscriptions/checkout", { method: "POST", body: JSON.stringify({ plan: quota?.plan === "FREE" ? "PLAN_99" : "PLAN_250" }) });
            if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
            else throw new Error("Checkout is unavailable.");
        } catch (error) {
            setCheckoutError(error.message || "Checkout could not be created. Please try again.");
        } finally {
            setCheckoutLoading(false);
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
                if (!activeDocumentId) {
                    setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
                }
            } else if (droppedFile) {
                setMessage("Please choose a PDF financial report.");
            }
        }
    }

    const analyticsReady = analyticsData.assets && analyticsData.liabilities;
    const analyticsBusy = analyticsLoading.assets || analyticsLoading.liabilities;
    const keyMetrics = analyticsData.profitLoss?.keyMetrics;
    const dayPart = currentDayPart;
    const welcomeImageSources = getWelcomeImageSources(dayPart);
    const welcomeImageUrl = welcomeImageSources[welcomeImageIndex];
    const firstName = String(user.userName || "there").trim().split(/\s+/)[0];
    const dayPartCopy = {
        morning: "Start the day with a clear view of your numbers.",
        afternoon: "Keep your financial decisions moving with confidence.",
        evening: "Close the day knowing what your numbers are saying.",
        night: "A clear financial view, whenever your next decision calls.",
    }[dayPart];

    return (
        <div className={`app workspace-app ${darkMode ? "theme-dark" : ""}`}>
            {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
            {mobileNavOpen && <nav className="mobile-nav-drawer" aria-label="Mobile navigation"><div className="mobile-drawer-head"><strong>Financial Analyzer</strong><button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><span className="close-icon" aria-hidden="true"><span /><span /></span></button></div><a href="#dashboard" onClick={() => setMobileNavOpen(false)}>Dashboard</a><a href="#documents" onClick={() => setMobileNavOpen(false)}>Documents</a><a href="#analytics" onClick={() => setMobileNavOpen(false)}>Analytics</a><button className="mobile-report-toggle" onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen}>Report history <span aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>{reportHistoryOpen && <div className="mobile-report-history">{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p></div> : <div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { handleDocumentSelect(document.id); setMobileNavOpen(false); }}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div>}</div>}<button className="mobile-logout" onClick={() => { setMobileNavOpen(false); handleLogout(); }}>Log out</button></nav>}
            <aside className="sidebar">
                <div className="brand-lockup"><span className="brand-mark">₹</span><strong>Financial<br />Analyzer</strong></div>
                <div className="sidebar-label">Workspace</div>
                <nav className="main-nav" aria-label="Main navigation">
                    <a className={`nav-item ${activeSection === "#dashboard" ? "is-active" : ""}`} href="#dashboard" aria-current={activeSection === "#dashboard" ? "page" : undefined}><NavIcon>+</NavIcon>Dashboard</a>
                    <a className="nav-item" href="#upload"><NavIcon>[]</NavIcon>Documents</a>
                    <a className={`nav-item ${activeSection === "#analytics" ? "is-active" : ""}`} href="#analytics" aria-current={activeSection === "#analytics" ? "page" : undefined}><NavIcon>~</NavIcon>Analytics</a>
                    <button id="documents" className={`nav-item nav-button report-history-toggle ${reportHistoryOpen ? "is-open" : ""}`} onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen} aria-controls="sidebar-report-history"><NavIcon>{reportHistoryOpen ? "-" : "+"}</NavIcon>Report history<span className="nav-chevron" aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>
                    {reportHistoryOpen && <div className="sidebar-report-history" id="sidebar-report-history"><div className="history-heading"><div><span className="eyebrow">Report history</span><h3>Reports</h3></div><span className="history-count">{documents.length}</span></div>{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p><a href="#upload">Upload PDF</a></div> : <><button className={`report-selector ${reportMenuOpen ? "is-open" : ""}`} onClick={() => setReportMenuOpen(open => !open)} aria-expanded={reportMenuOpen} disabled={documentsLoading}><span>{documents.find(document => document.id === activeDocumentId)?.original_filename || "Select report"}</span><span aria-hidden="true">⌄</span></button>{reportMenuOpen && <div className="report-menu"><span className="report-menu-label">Select report</span>{documents.map((document, index) => <button className={`report-option ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { setReportMenuOpen(false); handleDocumentSelect(document.id); }}><span>{document.id === activeDocumentId ? "✓" : ""}</span><span className="report-option-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}{document.extraction_status ? ` · ${document.extraction_status}` : ""}</small></span>{index === 0 && <em>Latest</em>}</button>)}</div>}<div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => handleDocumentSelect(document.id)}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div></>}</div>}
                </nav>
                <div className="sidebar-footer"><div className="sidebar-label">Account</div><button className="nav-item nav-button" onClick={handleLogout}><NavIcon>&gt;</NavIcon>Log out</button></div>
            </aside>
            <main className="workspace-main">
                <header className="topbar">
                    <button className={`mobile-menu ${mobileNavOpen ? "is-open" : ""}`} onClick={() => setMobileNavOpen(open => !open)} aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen}><span className="hamburger-icon" aria-hidden="true"><span /><span /><span /></span></button>
                    <div><span className="topbar-kicker">Workspace / Overview</span><h1>Dashboard</h1></div>
                    <div className="topbar-actions">
                        <button className="theme-toggle" onClick={() => setDarkMode(mode => !mode)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={darkMode}><span className="theme-toggle-icon" aria-hidden="true">{darkMode ? "☀" : "◐"}</span><span>{darkMode ? "Light mode" : "Dark mode"}</span></button>
                        <div className="account-controls"><div className="avatar">{String(user.userName || "U").slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user.userName}</strong><span>{user.email}</span></div><button onClick={handleLogout} className="logout-button">Log out</button></div>
                    </div>
                </header>
                <div className="content-grid" id="dashboard">
                    <section className={`welcome-panel welcome-panel-${dayPart}`}>
                        <img className="welcome-photo" src={welcomeImageUrl} alt="" aria-hidden="true" onError={() => setWelcomeImageIndex(index => index < welcomeImageSources.length - 1 ? index + 1 : index)} />
                        <div className="welcome-copy"><div className="welcome-meta"><span className="eyebrow">{dayPart === "night" ? "After-hours financial intelligence" : "Your financial intelligence desk"}</span></div><h2>{dayPart === "morning" ? "Good morning" : dayPart === "afternoon" ? "Good afternoon" : dayPart === "evening" ? "Good evening" : "Good night"}, {firstName}.</h2><p>{dayPartCopy} Upload a report to turn raw statements into useful insight.</p><a className="welcome-action" href="#upload">Review your numbers <span aria-hidden="true">→</span></a></div>
                        <div className="welcome-mark" aria-hidden="true"><span>+12.8%</span><i /></div>
                    </section>
                    {documents.length > 0 && <section className="kpi-grid" aria-label="Workspace summary">
                        <div className="kpi-card"><span className="kpi-label">Reports analyzed</span><strong>{documents.length}</strong><span className="kpi-foot">In this session</span></div>
                        <div className="kpi-card"><span className="kpi-label">Analytics status</span><strong className={analyticsReady ? "status-positive" : ""}>{analyticsReady ? "Ready" : uploading || analyticsBusy ? "Processing" : "Waiting"}</strong><span className="kpi-foot">Balance sheet insights</span></div>
                        <div className="kpi-card"><span className="kpi-label">Latest report</span><strong title={documents[0]?.original_filename}>{documents[0]?.original_filename || "--"}</strong><span className="kpi-foot">PDF document</span></div>
                    </section>}
                    <section className="upload-section" id="upload">
                        <SectionHeader eyebrow="Get started" title="Upload a financial report" description="Drop a PDF here to unlock your balance sheet analytics." />
                        <div className={`upload-zone ${file ? "has-file" : ""}`} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
                            <input id="file-upload" ref={fileInputRef} className="file-input" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} disabled={uploading} />
                            <label htmlFor="file-upload" className="upload-zone-content"><span className="upload-icon">↑</span><strong>{file ? file.name : "Drop your report here"}</strong><span>{file ? `${formatFileSize(file.size)} · PDF selected` : "or browse from your device"}</span><small>PDF files up to 25 MB</small></label>
                        </div>
                        <div className="upload-actions"><button className="primary-button upload-button" onClick={handleUpload} disabled={!file || uploading}>{uploading ? <LoadingIndicator label="Processing report..." /> : "Analyze report"}</button>{file && <span className="file-status"><span className="status-dot" /> Ready to analyze</span>}</div>
                        {message && <div className={`status-banner ${uploading ? "loading" : message.includes("Unable") || message.includes("Please") ? "error" : "success"}`}><strong>{uploading ? "Processing report" : message.includes("Unable") ? "Analysis could not be completed" : "Report update"}</strong><span>{message}</span></div>}
                    </section>
                    {documents.length > 0 && <section className="insights-section" id="analytics" tabIndex="-1">
                        <div className="insights-heading-row">
                            <SectionHeader eyebrow="Financial intelligence" title="Explore your report" description="Switch between financial position and profitability without leaving the workspace." />
                            <div className="insight-mode-switcher" role="tablist" aria-label="Financial intelligence views">
                                <button className={activeChart === "keyMetrics" ? "is-active" : ""} onClick={() => setActiveChart("keyMetrics")} role="tab" aria-selected={activeChart === "keyMetrics"}>
                                    <strong>Key Metrics</strong><span>Growth signals</span>
                                </button>
                                <button className={!['profitLoss', 'profitComparison', 'keyMetrics'].includes(activeChart) ? "is-active" : ""} onClick={() => setActiveChart("comparison")} role="tab" aria-selected={!['profitLoss', 'profitComparison', 'keyMetrics'].includes(activeChart)}>
                                    <strong>Balance sheet</strong><span>Assets & liabilities</span>
                                </button>
                                <button className={["profitLoss", "profitComparison"].includes(activeChart) ? "is-active" : ""} onClick={() => setActiveChart("profitLoss")} role="tab" aria-selected={["profitLoss", "profitComparison"].includes(activeChart)}>
                                    <strong>Profit & loss</strong><span>Revenue & expenses</span>
                                </button>
                            </div>
                        </div>
                        <div className="insights-workspace" id="insights-content">
                            <div className="insight-workspace-main">
                                {activeChart === "keyMetrics" ? (
                                    analyticsData.profitLoss || analyticsLoading.profitLoss ? (
                                        <section className="key-metrics-view" aria-label="Key metrics">
                                            {analyticsLoading.profitLoss ? <div className="analytics-loading"><LoadingIndicator label="Loading key metrics..." /></div> : <KeyMetricsGrid keyMetrics={keyMetrics} />}
                                        </section>
                                    ) : <div className="insights-skeleton"><LoadingIndicator label={documentsLoading ? "Loading reports..." : "Loading key metrics..."} /><span /></div>
                                ) : ["profitLoss", "profitComparison"].includes(activeChart) ? (
                                    (analyticsData.profitLoss || analyticsLoading.profitLoss) ? <>
                                        <div className="analytics-tabs" role="tablist" aria-label="Profit and loss analytics views">
                                            <button className={activeChart === "profitLoss" ? "is-active" : ""} onClick={() => setActiveChart("profitLoss")} role="tab" aria-selected={activeChart === "profitLoss"}>Expenses: {getValidYears(analyticsData.profitLoss)[0] || "Latest"} Breakdown</button>
                                            <button className={activeChart === "profitComparison" ? "is-active" : ""} onClick={() => setActiveChart("profitComparison")} role="tab" aria-selected={activeChart === "profitComparison"}>{getValidYears(analyticsData.profitLoss).slice(0, 2).join(" vs ") || "Comparison"}</button>
                                        </div>
                                        <section className="chart-panel chart-panel-featured">{analyticsLoading.profitLoss ? <div className="analytics-loading"><LoadingIndicator label="Loading profit and loss..." /></div> : activeChart === "profitComparison" ? <ProfitLossComparisonChart analyticsData={analyticsData.profitLoss} /> : <ProfitLossExpensesChart analyticsData={analyticsData.profitLoss} />}</section>
                                    </> : <div className="insights-skeleton"><LoadingIndicator label={documentsLoading ? "Loading reports..." : "Loading profit and loss insights..."} /><span /></div>
                                ) : (
                                    (analyticsData.assets || analyticsLoading.assets || analyticsLoading.liabilities) ? <>
                                        <div className="analytics-tabs" role="tablist" aria-label="Balance sheet analytics views">
                                            <button className={activeChart === "comparison" ? "is-active" : ""} onClick={() => setActiveChart("comparison")} role="tab" aria-selected={activeChart === "comparison"}>{getValidYears(analyticsData.assets).slice(0, 2).join(" vs ") || "Comparison"}</button>
                                            <button className={activeChart === "breakdown" ? "is-active" : ""} onClick={() => setActiveChart("breakdown")} role="tab" aria-selected={activeChart === "breakdown"}>{getValidYears(analyticsData.assets)[0] || "Latest"} Breakdown</button>
                                            <button className={activeChart === "liabilities" ? "is-active" : ""} onClick={() => setActiveChart("liabilities")} role="tab" aria-selected={activeChart === "liabilities"}>Liabilities {getValidYears(analyticsData.liabilities)[0] || "Latest"}</button>
                                        </div>
                                        <section className="chart-panel chart-panel-featured">{activeChart === "comparison" ? analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsComparisonChart analyticsData={analyticsData.assets} /> : activeChart === "breakdown" ? analyticsLoading.assets ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <AssetsBreakdownChart analyticsData={analyticsData.assets} /> : analyticsLoading.liabilities ? <div className="analytics-loading"><LoadingIndicator label="Loading analytics..." /></div> : <LiabilitiesBreakdownChart analyticsData={analyticsData.liabilities} />}</section>
                                    </> : <div className="insights-skeleton"><LoadingIndicator label={documentsLoading ? "Loading reports..." : "Loading insights..."} /><span /></div>
                                )}
                            </div>
                        </div>
                    </section>}
                </div>
                {contactOpen && <div className="contact-backdrop" onClick={() => setContactOpen(false)} aria-hidden="true" />}
                {contactOpen && <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Support</span><h2 id="contact-title">Contact Financial Analyzer</h2></div><button className="contact-close" onClick={() => setContactOpen(false)} aria-label="Close contact dialog">×</button></div>
                    {contactSent ? <div className="contact-success"><strong>Your message is ready for the workspace team.</strong><p>We will review your request and follow up through the email you provided.</p><button className="primary-button" onClick={() => { setContactSent(false); setContactOpen(false); }}>Done</button></div> : <form className="contact-form" onSubmit={event => { event.preventDefault(); setContactSent(true); }}>
                        <label>Subject<input name="subject" type="text" placeholder="How can we help?" required /></label>
                        <label>Email<input name="email" type="email" defaultValue={user.email || ""} placeholder="you@example.com" required /></label>
                        <label>Message<textarea name="message" placeholder="Tell us what you need help with..." rows="5" required /></label>
                        <button className="primary-button" type="submit">Send message</button>
                    </form>}
                </section>}
                {quotaModalOpen && <UpgradeModal quota={quota} onClose={() => setQuotaModalOpen(false)} onContact={() => { setQuotaModalOpen(false); setContactSent(false); setContactOpen(true); }} onCheckout={handleCheckout} checkoutLoading={checkoutLoading} checkoutError={checkoutError} />}
                {termsOpen && <div className="contact-backdrop" onClick={() => setTermsOpen(false)} aria-hidden="true" />}
                {termsOpen && <section className="contact-dialog policy-dialog" role="dialog" aria-modal="true" aria-labelledby="terms-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Policy</span><h2 id="terms-title">Financial Analyzer Terms</h2></div><button className="contact-close" onClick={() => setTermsOpen(false)} aria-label="Close terms dialog">×</button></div>
                    <div className="policy-content">
                        <p className="policy-effective">Effective August 20, 2026</p>
                        <h3>Using Financial Analyzer</h3>
                        <p>Financial Analyzer provides a private workspace for uploading reports and reviewing generated financial insights. By using the app, you agree to use it lawfully and keep your account information accurate.</p>
                        <h3>Your documents</h3>
                        <p>You remain responsible for the reports you upload and for confirming that you have permission to analyze them. Do not upload documents that you are not authorized to share.</p>
                        <h3>Analytics are informational</h3>
                        <p>Generated summaries and charts are provided for analysis support only. They are not accounting, investment, tax, or legal advice, and you should verify important decisions with a qualified professional.</p>
                        <h3>Availability and changes</h3>
                        <p>We may improve, update, or temporarily limit parts of the service. We may also update these terms when the product changes. Continued use after an update means you accept the revised terms.</p>
                    </div>
                </section>}
                {privacyOpen && <div className="contact-backdrop" onClick={() => setPrivacyOpen(false)} aria-hidden="true" />}
                {privacyOpen && <section className="contact-dialog policy-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Policy</span><h2 id="privacy-title">Financial Analyzer Privacy</h2></div><button className="contact-close" onClick={() => setPrivacyOpen(false)} aria-label="Close privacy dialog">×</button></div>
                    <div className="policy-content">
                        <p className="policy-effective">Updated August 20, 2026</p>
                        <h3>Information we use</h3>
                        <p>Financial Analyzer uses account details, uploaded report information, and workspace activity to provide authentication, document processing, analytics, and support.</p>
                        <h3>Your uploaded reports</h3>
                        <p>Reports are processed to extract financial information for your workspace. Keep sensitive documents limited to files you are authorized to upload, and remove documents you no longer need.</p>
                        <h3>Security and retention</h3>
                        <p>We use access controls and protected sessions to help secure your workspace. Data may be retained while your account or document history is active, subject to the app's storage and deletion workflows.</p>
                        <h3>Your choices</h3>
                        <p>You can review your workspace documents, request support, and contact the Financial Analyzer team about account or privacy questions through the Contact form.</p>
                    </div>
                </section>}
                {securityOpen && <div className="contact-backdrop" onClick={() => setSecurityOpen(false)} aria-hidden="true" />}
                {securityOpen && <section className="contact-dialog policy-dialog" role="dialog" aria-modal="true" aria-labelledby="security-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Trust and safety</span><h2 id="security-title">Financial Analyzer Security</h2></div><button className="contact-close" onClick={() => setSecurityOpen(false)} aria-label="Close security dialog">×</button></div>
                    <div className="policy-content">
                        <p className="policy-effective">Security practices for your workspace</p>
                        <h3>Protected access</h3>
                        <p>Accounts use authenticated sessions and protected workspace access so documents and analytics are available only to the signed-in user.</p>
                        <h3>Document handling</h3>
                        <p>Uploaded reports are processed for document extraction and financial analysis. Avoid sharing credentials, tokens, or documents with people who are not authorized to access them.</p>
                        <h3>Report a concern</h3>
                        <p>If you notice suspicious activity, an unexpected document, or a possible security issue, use the Contact form and include enough detail for the Financial Analyzer team to investigate.</p>
                        <h3>Account responsibility</h3>
                        <p>Use a strong, unique password, keep your email account secure, and sign out on shared devices. We may update these practices as the product evolves.</p>
                    </div>
                </section>}
                {docsOpen && <div className="contact-backdrop" onClick={() => setDocsOpen(false)} aria-hidden="true" />}
                {docsOpen && <section className="contact-dialog docs-dialog" role="dialog" aria-modal="true" aria-labelledby="docs-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Financial Analyzer</span><h2 id="docs-title">Documentation</h2></div><button className="contact-close" onClick={() => setDocsOpen(false)} aria-label="Close documentation">×</button></div>
                    <label className="docs-search">Search documentation<input type="search" value={docsQuery} onChange={event => setDocsQuery(event.target.value)} placeholder="Search reports, analytics, account..." /></label>
                    <div className="docs-list">{appDocs.filter(section => `${section.title} ${section.text}`.toLowerCase().includes(docsQuery.toLowerCase())).map(section => <article className="docs-item" key={section.title}><h3>{section.title}</h3><p>{section.text}</p></article>)}{appDocs.every(section => !`${section.title} ${section.text}`.toLowerCase().includes(docsQuery.toLowerCase())) && <div className="docs-empty">No documentation topics match your search.</div>}</div>
                </section>}
                {cookiesOpen && <div className="contact-backdrop" onClick={() => setCookiesOpen(false)} aria-hidden="true" />}
                {cookiesOpen && <section className="contact-dialog cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="cookies-title">
                    <div className="contact-dialog-head"><div><span className="eyebrow">Financial Analyzer</span><h2 id="cookies-title">Manage cookie preferences</h2></div><button className="contact-close" onClick={() => setCookiesOpen(false)} aria-label="Close cookie preferences">×</button></div>
                    <div className="policy-content"><p>Cookies are small files stored on your device to remember settings, keep your workspace secure, and help us understand how the app is used.</p><h3>Required</h3><p>Required cookies support sign-in, secure sessions, preferences, and core workspace functions. They cannot be switched off.</p><div className="cookie-choice"><div><strong>Required cookies</strong><span>Always active</span></div><span className="cookie-status is-required">Required</span></div><h3>Analytics</h3><p>Analytics cookies help us understand which screens and workflows are useful so we can improve Financial Analyzer.</p><div className="cookie-choice"><div><strong>Analytics cookies</strong><span>Optional usage insights</span></div><div className="cookie-actions"><button className={cookiePreferences.analytics ? "is-selected" : ""} onClick={() => setCookiePreferences(preferences => ({ ...preferences, analytics: true }))}>Accept</button><button className={!cookiePreferences.analytics ? "is-selected" : ""} onClick={() => setCookiePreferences(preferences => ({ ...preferences, analytics: false }))}>Reject</button></div></div><h3>Social media and advertising</h3><p>Financial Analyzer does not use social media or advertising cookies.</p><div className="cookie-choice"><div><strong>Social media and advertising</strong><span>Not used</span></div><span className="cookie-status">Not used</span></div></div>
                    <button className="primary-button cookie-save" onClick={() => { window.localStorage.setItem("financial-cookie-preferences", JSON.stringify(cookiePreferences)); setCookiesOpen(false); }}>Save changes</button>
                </section>}
                <footer className="workspace-footer">
                    <div className="footer-brand"><span className="brand-mark">₹</span><span className="footer-copyright">© 2026 Financial Analyzer</span></div>
                    <nav className="footer-navigation" aria-label="Footer navigation">
                        <button className="footer-link" onClick={() => setTermsOpen(true)}>Terms</button>
                        <button className="footer-link" onClick={() => setPrivacyOpen(true)}>Privacy</button>
                        <button className="footer-link" onClick={() => setSecurityOpen(true)}>Security</button>
                        <span>Status</span>
                        <a className="footer-link" href="https://www.youtube.com/@chandrashekhar6883/" target="_blank" rel="noreferrer">Community</a>
                        <button className="footer-link" onClick={() => { setDocsQuery(""); setDocsOpen(true); }}>Docs</button>
                        <button className="footer-link" onClick={() => { setContactSent(false); setContactOpen(true); }}>Contact</button>
                        <button className="footer-link" onClick={() => setCookiesOpen(true)}>Manage cookies</button>
                        <span>Do not share my personal information</span>
                    </nav>
                </footer>
            </main>
        </div>
    );
}

export default App;