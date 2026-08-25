import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import "./App.css";

import AssetsBreakdownChart from "./components/AssetsBreakdownChart";
import AssetsComparisonChart from "./components/AssetsComparisonChart";
import LiabilitiesBreakdownChart from "./components/LiabilitiesBreakdownChart";
import BalanceSheet1A from "./components/BalanceSheet1A";
import { getValidYears } from "./utils/analyticsData";
import ProfitLossComparisonChart from "./components/ProfitLossComparisonChart";
import ProfitLossExpensesChart from "./components/ProfitLossExpensesChart";
import ProfitLoss1A from "./components/ProfitLoss1A";
import KeyMetricsGrid from "./components/keyMetrics/KeyMetricsGrid";
import KeyMetrics1A from "./components/keyMetrics/KeyMetrics1A";
import { selectHistoricalData } from "./components/keyMetrics/keyMetrics1AData";
import AdminDashboard from "./components/admin/AdminDashboard";
import StatusMessage from "./components/StatusMessage";
import { canAnalyzeFiles, canUploadForCompany, getBatchResultState, getIdentityValidationState, mergeUniqueFiles, removeFileByIdentity } from "./utils/uploadBatchState";
import { extractIdentityFromPdf } from "./utils/pdfIdentityPreflight";
import { defaultAnalyticsTab, isAnalyticsTabActive, visibleAnalyticsTabs } from "./config/analyticsTabs.config";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const initialAuthForm = { userName: "", email: "", password: "", registrationIntent: "owner", companyName: "", cin: "", pan: "" };
const ACTIVE_COMPANY_STORAGE_KEY = "financial-active-company";

function getUserCompanies(user) {
    return Array.isArray(user?.companies) ? user.companies : user?.company ? [user.company] : [];
}

function toActiveCompany(company) {
    if (!company) return null;
    return {
        companyId: company.companyId,
        companyName: company.companyName,
        cin: company.cin,
        pan: company.pan,
        accessRole: company.accessRole,
    };
}

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

function getDayPart(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
}

const workspaceWelcomeVideo = "https://cdn.dribbble.com/userupload/15158652/file/original-d1a0d5fa39a82f7bbe884e1d1e3bef36.mp4";
const landingDemoStages = [
    { label: "Checking report identity", detail: "CIN matched to workspace", progress: 28, metric: "1 / 3" },
    { label: "Extracting statements", detail: "18 line items found", progress: 64, metric: "2 / 3" },
    { label: "Writing findings", detail: "2 changes worth a look", progress: 92, metric: "3 / 3" },
];

function LandingPage({ onGetStarted, showEntryChooser }) {
    const [entryChooserOpen, setEntryChooserOpen] = useState(false);
    const [demoStageIndex, setDemoStageIndex] = useState(0);
    const heroVisualRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: heroVisualRef, offset: ["start end", "end start"] });
    const heroY = useTransform(scrollYProgress, [0, 1], [18, -18]);
    const demoStage = landingDemoStages[demoStageIndex];

    useEffect(() => {
        if (!showEntryChooser) return undefined;
        const openTimer = window.setTimeout(() => setEntryChooserOpen(true), 0);
        return () => window.clearTimeout(openTimer);
    }, [showEntryChooser]);

    useEffect(() => {
        if (prefersReducedMotion) return undefined;
        const demoTimer = window.setInterval(() => {
            setDemoStageIndex(current => (current + 1) % landingDemoStages.length);
        }, 2600);
        return () => window.clearInterval(demoTimer);
    }, [prefersReducedMotion]);

    function openEntryChooser() {
        setEntryChooserOpen(true);
    }

    function selectEntryPath(mode, registrationIntent) {
        setEntryChooserOpen(false);
        onGetStarted(mode, registrationIntent);
    }

    const reveal = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } };
    const stagger = { visible: { transition: { staggerChildren: 0.08 } } };
    const fadeViewport = { once: true, amount: 0.25 };

    return (
        <div className="landing-page nl-page">
            <header className="nl-masthead">
                <motion.div className="nl-scroll-progress" style={{ scaleX: scrollYProgress }} />
                <div className="nl-shell nl-mast-inner">
                    <div className="nl-brand"><span className="nl-brand-mark">₹</span><span className="nl-brand-name">Financial Analyzer</span></div>
                    <nav className="nl-nav" aria-label="Sections"><a href="#reading">How it reads</a><a href="#findings">Findings</a><a href="#plans">Plans</a></nav>
                    <motion.button className="nl-btn" type="button" onClick={openEntryChooser} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>Analyse a report <i aria-hidden="true">→</i></motion.button>
                </div>
            </header>
            <main id="main">
                <section className="nl-hero"><div className="nl-shell nl-hero-grid">
                    <motion.div className="nl-hero-copy" variants={stagger} initial="hidden" animate="visible">
                        <motion.span className="nl-eyebrow" variants={reveal}>Reads MCA annual reports · Schedule III</motion.span>
                        <motion.h1 className="nl-h1" variants={reveal}>Your annual report, <em>read closely.</em></motion.h1>
                        <motion.p className="nl-lede" variants={reveal}>Upload a financial report. Get the numbers, the trends, and the few things worth your attention.</motion.p>
                        <motion.div className="nl-hero-actions" variants={reveal}><motion.button className="nl-btn nl-btn-lg" type="button" onClick={openEntryChooser} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>Analyse a report <i aria-hidden="true">→</i></motion.button><motion.a className="nl-btn nl-btn-lg nl-btn-ghost" href="#findings" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>See what it finds</motion.a></motion.div>
                        <motion.div className="nl-proof-strip" variants={reveal}><div><strong>18</strong><span>line items</span></div><div><strong>2</strong><span>findings surfaced</span></div><div><strong>1 min</strong><span>to first read</span></div></motion.div>
                    </motion.div>
                    <motion.div ref={heroVisualRef} className="nl-doc-wrap" style={{ y: prefersReducedMotion ? 0 : heroY }} initial={{ opacity: 0, rotate: 1 }} animate={{ opacity: 1, rotate: 0 }} transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
                        <figure className="nl-doc"><motion.div className="nl-scan-line" animate={prefersReducedMotion ? { opacity: 0 } : { top: ["10%", "90%", "10%"], opacity: [0, 0.8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" /><motion.div className="nl-live-console" key={demoStage.label} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><span className="nl-live-dot" /><span>{demoStage.label}</span><b>{demoStage.metric}</b><i><motion.span animate={{ width: `${demoStage.progress}%` }} transition={{ duration: 0.6 }} /></i><small>{demoStage.detail}</small></motion.div><div className="nl-doc-head"><span className="nl-doc-co">Meridian Alloys Private Limited</span><span className="nl-tag">Sample</span><span className="nl-doc-cin">CIN <b>U27100PB2022PTC000000</b> · matched to your workspace</span></div><div className="nl-doc-caption">Balance sheet as at 31 March 2025 · Equity and liabilities · ₹</div>
                            <table className="nl-table"><caption>Extract of a balance sheet with findings noted against source rows</caption><thead><tr><th>Particulars</th><th className="nl-refhead">Note</th><th className="nl-num">As at 31.03.2025</th></tr></thead><tbody><tr className="nl-group"><td colSpan="3">Shareholders’ funds</td></tr><tr className="nl-row"><td>Share capital</td><td className="nl-ref">Note 3</td><td className="nl-num">1,20,00,000</td></tr><tr className="nl-row nl-linked"><td>Reserves and surplus</td><td className="nl-ref">Note 4</td><td className="nl-num">3,42,18,640</td></tr><tr className="nl-anno"><td colSpan="3"><div className="nl-note"><span className="nl-elbow">↳</span><p className="nl-note-body"><b>Finding</b>Up 24% on last year. The buffer is real.</p></div></td></tr><tr className="nl-group"><td colSpan="3">Current liabilities</td></tr><tr className="nl-row nl-linked nl-flag"><td>Trade payables</td><td className="nl-ref">Note 7</td><td className="nl-num">94,22,180</td></tr><tr className="nl-anno nl-flag"><td colSpan="3"><div className="nl-note"><span className="nl-elbow">↳</span><p className="nl-note-body"><b>Worth a look</b>Payables grew 31% against 9% revenue growth.</p></div></td></tr><tr className="nl-row"><td>Short-term provisions</td><td className="nl-ref">Note 8</td><td className="nl-num">31,08,450</td></tr><tr className="nl-total"><td>Total</td><td></td><td className="nl-num">7,73,89,270</td></tr></tbody></table>
                            <figcaption className="nl-doc-foot"><span>33 pages read</span><span>·</span><span>18 line items extracted</span><span>2 findings</span></figcaption>
                        </figure><motion.div className="nl-stamp" initial={{ opacity: 0, scale: 0.8, rotate: -7 }} animate={{ opacity: 0.92, scale: 1, rotate: -7 }} transition={{ delay: 1, type: "spring", stiffness: 220, damping: 16 }}><b>Read</b><span>31 Mar 2025</span></motion.div>
                    </motion.div>
                </div></section>
                <section className="nl-band nl-band-paper" id="reading"><div className="nl-shell"><motion.div className="nl-band-head" variants={stagger} initial="hidden" whileInView="visible" viewport={fadeViewport}><motion.span className="nl-eyebrow" variants={reveal}>How it reads a filing</motion.span><motion.h2 className="nl-h2" variants={reveal}>From PDF to point of view.</motion.h2><motion.p className="nl-lede" variants={reveal}>Three quick passes. One useful read.</motion.p></motion.div><div className="nl-stages">{[{ label: "01 · Verify", title: "Right company", text: "CIN matched before upload.", rows: ["CIN · U27100PB2022PTC000000", "Match · Confirmed", "Upload · Ready"] }, { label: "02 · Extract", title: "Clean numbers", text: "Tables pulled from the report.", rows: ["Share capital · 1,20,00,000", "Reserves · 3,42,18,640", "18 of 18 · extracted"] }, { label: "03 · Explain", title: "Clear findings", text: "Trends turned into sentences.", rows: ["Current ratio · 1.42", "Interest cover · 4.1×", "Worth a look · 2"] }].map(stage => <motion.article className="nl-stage" key={stage.label} variants={reveal} initial="hidden" whileInView="visible" viewport={fadeViewport}><span className="nl-stage-label">{stage.label}</span><h3>{stage.title}</h3><p>{stage.text}</p><div className="nl-mini">{stage.rows.map(row => <div className="nl-mini-row" key={row}><span>{row.split(" · ")[0]}</span><span>{row.split(" · ")[1]}</span></div>)}</div></motion.article>)}</div></div></section>
                <section className="nl-band nl-band-deep" id="findings"><div className="nl-shell"><div className="nl-band-head"><span className="nl-eyebrow">What it finds</span><h2 className="nl-h2">The few things worth a look.</h2><p className="nl-lede">Every insight stays linked to its source row.</p></div><div className="nl-findings">{[{ name: "Reserves and surplus", metric: "+24% year on year", quote: "Growth was funded from inside the business.", source: "Note 4 · Note 5" }, { name: "Trade payables", metric: "+31% year on year", quote: "Payables grew faster than revenue. Cash is being held back.", source: "Note 7 · Profit and loss", flag: true }, { name: "Current ratio", metric: "1.42, from 1.78", quote: "Still comfortable, but the direction is worth watching.", source: "Note 7 · Note 8" }, { name: "Interest cover", metric: "4.1×", quote: "Debt is not the thing to worry about here.", source: "Note 5 · Finance costs" }].map(finding => <motion.article className="nl-finding" data-flag={finding.flag || undefined} key={finding.name} initial="hidden" whileInView="visible" viewport={fadeViewport} variants={reveal}><div className="nl-finding-meta"><b>{finding.name}</b><span>{finding.metric}</span></div><q>{finding.quote}</q><span className="nl-finding-src">Traced to {finding.source}</span></motion.article>)}</div></div></section>
                <section className="nl-band nl-band-paper" id="plans"><div className="nl-shell"><div className="nl-band-head"><span className="nl-eyebrow">Plans</span><h2 className="nl-h2">Priced by reports, not by seats.</h2><p className="nl-lede">Start with one report and see whether the reading is useful. The only thing that changes is how many filings you can put through it.</p></div><div className="nl-plans">{[{ name: "Free", audience: "For a first look", price: "$0", reports: "1 report", features: ["Core analytics", "Shared company viewing"] }, { name: "Standard", audience: "For owners and managers", price: "$99", reports: "25 reports", features: ["Balance sheet analytics", "Profit and loss insights", "Report history"], featured: true }, { name: "Volume", audience: "For growing teams", price: "$250", reports: "250 reports", features: ["Everything in Standard", "Longer report history", "Priority capacity"] }].map(plan => <motion.div className="nl-plan" data-featured={plan.featured || undefined} key={plan.name} initial="hidden" whileInView="visible" viewport={fadeViewport} variants={reveal}><div className="nl-plan-name"><strong>{plan.name}</strong><span>{plan.audience}</span></div><div className="nl-plan-price"><strong>{plan.price}</strong><span>{plan.reports}</span></div><div className="nl-plan-inc">{plan.features.map(feature => <span key={feature}><i>✓</i>{feature}</span>)}</div><button className={`nl-btn ${plan.featured ? "" : "nl-btn-ghost"}`} type="button" onClick={openEntryChooser}>{plan.featured ? "Choose Standard" : plan.name === "Free" ? "Start free" : "Choose Volume"}</button></motion.div>)}</div><p className="nl-plan-note"><span>Need more than one company in one workspace?</span><a href="mailto:support@financialanalyzer.app">Write to us</a></p></div></section>
                <section className="nl-close"><div className="nl-shell nl-close-grid"><span className="nl-eyebrow">Ready when you are</span><h2>Bring the filing you have been putting off.</h2><p>One PDF, no card. You will know inside a minute whether the reading is useful.</p><button className="nl-btn nl-btn-lg nl-btn-inv" type="button" onClick={openEntryChooser}>Analyse a report <i aria-hidden="true">→</i></button></div></section>
            </main>
            <footer className="nl-foot"><div className="nl-shell nl-foot-inner"><span>₹ Financial Analyzer</span><a href="mailto:support@financialanalyzer.app">support@financialanalyzer.app</a><span>Figures shown are a sample, not a real filing.</span></div></footer>
            <AnimatePresence>
                {entryChooserOpen && <motion.div className="entry-chooser-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <motion.button className="auth-dialog-backdrop" type="button" aria-label="Close start options" onClick={() => setEntryChooserOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.section className="entry-chooser" role="dialog" aria-modal="true" aria-labelledby="entry-chooser-title" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}>
                    <button className="auth-close" type="button" aria-label="Close start options" onClick={() => setEntryChooserOpen(false)}>×</button>
                    <span className="eyebrow">Start with clarity</span>
                    <h2 id="entry-chooser-title">How will you use Financial Analyzer?</h2>
                    <p>Choose an option to continue. You can change this later by signing out.</p>
                    <AuthPathChooser standalone onSelect={selectEntryPath} />
                </motion.section>
                </motion.div>}
            </AnimatePresence>
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

function CompanyAccessSection({ companies, activeCompanyId, expanded, onToggle, expandedCompanies, onSelectCompany, onToggleCompany, idPrefix = "sidebar" }) {
    return <div className="sidebar-companies">
        <button className={`nav-item nav-button companies-toggle ${expanded ? "is-open" : ""}`} onClick={onToggle} aria-expanded={expanded} aria-controls="sidebar-companies-list">
            <NavIcon>+</NavIcon>
            Companies
            <span className="nav-chevron" aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
        </button>
        {expanded && <div className="sidebar-companies-list" id={`${idPrefix}-companies-list`}>
            {companies.length === 0 ? <p className="companies-empty">No company assigned</p> : companies.map(company => {
                const companyDetailsId = `${idPrefix}-company-${company.companyId}`;
                const companyExpanded = expandedCompanies[company.companyId] === true;
                const isSelected = String(activeCompanyId) === String(company.companyId);
                return <div className="sidebar-company" key={company.companyId}>
                    <button type="button" className={`sidebar-company-toggle ${companyExpanded ? "is-open" : ""} ${isSelected ? "is-selected" : ""}`} onClick={() => { onSelectCompany(company.companyId); onToggleCompany(company.companyId); }} aria-expanded={companyExpanded} aria-controls={companyDetailsId} aria-pressed={isSelected}>
                        <span className="company-selection-indicator" aria-hidden="true">{isSelected ? "●" : "○"}</span>
                        <span className="sidebar-company-copy"><strong>{company.companyName}</strong><small>Access role: {company.accessRole}</small><small>CIN: {company.cin || "Not available"}</small></span>
                        <span className="nav-chevron" aria-hidden="true">{companyExpanded ? "⌃" : "⌄"}</span>
                    </button>
                    {companyExpanded && <div className="sidebar-company-details" id={companyDetailsId}>
                        <span>CIN: <strong>{company.cin || "Not available"}</strong></span>
                        <span>PAN: <strong>{company.pan || "Not available"}</strong></span>
                        <span>Access role: <strong>{company.accessRole}</strong></span>
                    </div>}
                </div>;
            })}
        </div>}
    </div>;
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

function RegistrationFields({ authForm, onChange }) {
    const isOwner = authForm.registrationIntent === "owner";
    return isOwner ? <div className="auth-company-fields">
            <div className="auth-form-section"><strong>Company information</strong><small>We use these details to match your financial reports.</small></div>
            <label>Company Name *<input name="companyName" type="text" placeholder="Registered company name" value={authForm.companyName} onChange={onChange} required autoComplete="organization" /></label>
            <div className="auth-field-row"><label>CIN *<input name="cin" type="text" placeholder="Enter your company CIN" value={authForm.cin} onChange={onChange} required maxLength="30" /></label><label>PAN (optional)<input name="pan" type="text" placeholder="Optional PAN" value={authForm.pan} onChange={onChange} maxLength="20" /></label></div>
        </div> : null;
}

function AuthPathChooser({ authMode = "", registrationIntent = "owner", onSelect, standalone = false }) {
    const paths = [
        { id: "owner", number: "01", title: "Create a company workspace", description: "For owners and managers who upload and analyze their own reports.", mode: "register", intent: "owner" },
        { id: "login", number: "02", title: "Sign in to a company workspace", description: "For existing users who already have account access to a company.", mode: "login", intent: registrationIntent },
        { id: "consumer", number: "03", title: "View a shared workspace", description: "For people invited to analyze reports shared by a company.", mode: "register", intent: "consumer" },
    ];
    return <div className="auth-paths" aria-label="Choose how to continue">
        <div className="auth-paths-heading"><strong>How would you like to continue?</strong><span>Choose the option that fits you best.</span></div>
        <div className="auth-path-grid">
            {paths.map(path => {
                const selected = !standalone && path.mode === authMode && (path.mode === "login" || path.intent === registrationIntent);
                return <motion.button type="button" className={`auth-path-card auth-path-${path.id} ${selected ? "is-selected" : ""}`} key={path.id} onClick={() => onSelect(path.mode, path.intent)} aria-pressed={selected} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
                    <span className="auth-path-number">{path.number}</span><span className="auth-path-copy"><strong>{path.title}</strong><small>{path.description}</small></span><span className="auth-path-arrow" aria-hidden="true">→</span>
                </motion.button>;
            })}
        </div>
    </div>;
}

function GoogleLogo() {
    return <svg aria-hidden="true" className="google-logo" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M21.35 12.1c0-.71-.06-1.4-.18-2.05H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.24Z" />
        <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.99Z" />
        <path fill="#FBBC05" d="M6.53 14.07a5.86 5.86 0 0 1 0-3.74V7.8H3.29a9.75 9.75 0 0 0 0 8.8l3.24-2.53Z" />
        <path fill="#EA4335" d="M12 6.3c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.4 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.71 5.3l3.24 2.53C7.3 8.02 9.46 6.3 12 6.3Z" />
    </svg>;
}

async function requestAnalytics(documentId, analyticsType, companyId) {
    console.log(`[ANALYTICS] Starting ${analyticsType} request`, {
        documentId,
        analyticsType,
    });

    const result = await requestJson(
        `/documents/${documentId}/analytics`,
        {
            method: "POST",
            body: JSON.stringify({ analyticsType, companyId }),
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
    const [activeCompany, setActiveCompany] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState(initialAuthForm);
    const [authMessage, setAuthMessage] = useState("");
    const [authSubmitting, setAuthSubmitting] = useState(false);
    const [landingView, setLandingView] = useState("landing");
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [entryChooserRequest, setEntryChooserRequest] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [identityState, setIdentityState] = useState({ status: "idle", identities: [], error: "" });
    const [uploadStatuses, setUploadStatuses] = useState([]);
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
    const [activeChart, setActiveChart] = useState(defaultAnalyticsTab);
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
    const [companiesOpen, setCompaniesOpen] = useState(false);
    const [expandedCompanies, setExpandedCompanies] = useState({});
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const prefersReducedMotion = useReducedMotion();
    const currentDayPart = getDayPart(currentTime.getHours());
    const analyticsRequestRef = useRef(0);
    const googleButtonRef = useRef(null);
    const fileInputRef = useRef(null);
    const googleInitializedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        async function validateSelectedIdentities() {
            if (selectedFiles.length === 0) {
                setIdentityState({ status: "idle", identities: [], error: "" });
                return;
            }
            setIdentityState({ status: "checking", identities: [], error: "Checking report identity..." });
            const fileHashes = await Promise.all(selectedFiles.map(async ({ file }) => {
                const buffer = await file.arrayBuffer();
                const digest = await window.crypto.subtle.digest("SHA-256", buffer);
                file.fileHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
                return file.fileHash;
            }));
            let cachedDocuments = [];
            try {
                const result = await requestJson("/documents/identity", { method: "POST", body: JSON.stringify({ fileHashes }) });
                cachedDocuments = result.documents ?? [];
            } catch {
                // Cache lookup is optional; new files must still be checked locally with PDF.js.
            }
            const cachedByHash = new Map(cachedDocuments.map(document => [document.fileHash, document.identity]));
            const identities = await Promise.all(selectedFiles.map(async ({ file, name }) => {
                const cached = cachedByHash.get(file.fileHash);
                if (cached) return { fileHash: file.fileHash, identity: cached };
                try {
                    return { fileHash: file.fileHash, identity: { filename: name, ...(await extractIdentityFromPdf(file)) } };
                } catch (error) {
                    return { fileHash: file.fileHash, identity: { filename: name, status: "error", error: error.message, extractionError: error.debugMessage || "PDF.js could not read the file." } };
                }
            }));
            if (!cancelled) setIdentityState(getIdentityValidationState(selectedFiles, identities));
        }
        validateSelectedIdentities();
        return () => { cancelled = true; };
    }, [selectedFiles]);

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
        if (!user) return undefined;

        const refreshUser = async () => {
            if (document.visibilityState === "hidden") return;
            try {
                const result = await requestJson("/auth/me");
                setUser(result.user);
            } catch {
                return;
            }
        };

        window.addEventListener("focus", refreshUser);
        document.addEventListener("visibilitychange", refreshUser);
        return () => {
            window.removeEventListener("focus", refreshUser);
            document.removeEventListener("visibilitychange", refreshUser);
        };
    }, [user]);

    useEffect(() => {
        if (!user) {
            setActiveCompany(null);
            return;
        }

        const companies = getUserCompanies(user);
        let persistedCompanyId = null;
        try {
            persistedCompanyId = window.sessionStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
        } catch {
            persistedCompanyId = null;
        }
        const selectedCompany = companies.find(company => String(company.companyId) === String(persistedCompanyId)) || companies[0] || null;
        setActiveCompany(toActiveCompany(selectedCompany));
    }, [user]);

    useEffect(() => {
        if (!user || !activeCompany) return;
        try {
            window.sessionStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, String(activeCompany.companyId));
        } catch {
            return;
        }
    }, [activeCompany, user]);

    useEffect(() => {
        if (!authLoading && window.location.pathname.startsWith("/admin") && (!user || user.role !== "admin")) {
            window.location.replace("/");
        }
    }, [authLoading, user]);

        async function loadAnalytics(documentId, companyId = activeCompany?.companyId) {
            const requestId = analyticsRequestRef.current + 1;
            analyticsRequestRef.current = requestId;
            setAnalyticsLoading({ assets: true, liabilities: true, profitLoss: true });
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });

            try {
                const [assets, liabilities, profitLoss] = await Promise.all([
                    requestAnalytics(documentId, "assetsBreakdown", companyId),
                    requestAnalytics(documentId, "liabilitiesBreakdown", companyId),
                    requestAnalytics(documentId, "profitLoss", companyId),
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

            analyticsRequestRef.current += 1;
            setDocuments([]);
            setActiveDocumentId(null);
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
            let cancelled = false;
            setDocumentsLoading(true);
            const documentsPath = activeCompany?.companyId
                ? `/documents?companyId=${encodeURIComponent(activeCompany.companyId)}`
                : "/documents";
            requestJson(documentsPath)
                .then(result => {
                    if (cancelled) return;

                    const nextDocuments = result.documents ?? [];
                    setDocuments(nextDocuments);

                    const latestDocument = nextDocuments[0];
                    if (latestDocument) {
                        setActiveDocumentId(latestDocument.id);
                        loadAnalytics(latestDocument.id, activeCompany?.companyId).catch(error => {
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
        }, [user?.userId, activeCompany?.companyId]);

    function updateAuthField(event) {
        setAuthForm(current => {
            if (event.target.name === "registrationIntent") {
                return { ...current, registrationIntent: event.target.value, ...(event.target.value === "consumer" ? { companyName: "", cin: "", pan: "" } : {}) };
            }
            return { ...current, [event.target.name]: event.target.value };
        });
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
            setAuthDialogOpen(false);
            setAuthForm(initialAuthForm);
        } catch (error) {
            setAuthMessage(error.message);
        } finally {
            setAuthSubmitting(false);
        }
    }

    const openAuthFlow = useCallback((mode = "login", registrationIntent = "owner") => {
        setLandingView("landing");
        setAuthMode(mode);
        setAuthForm(current => ({ ...current, registrationIntent, ...(registrationIntent === "consumer" ? { companyName: "", cin: "", pan: "" } : {}) }));
        setAuthMessage("");
        setAuthDialogOpen(true);
    }, []);

    function returnToEntryOptions() {
        setAuthDialogOpen(false);
        setEntryChooserRequest(request => request + 1);
    }

    useEffect(() => {
        if (!authDialogOpen) return undefined;

        const handleEscape = event => {
            if (event.key === "Escape" && !authSubmitting) setAuthDialogOpen(false);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [authDialogOpen, authSubmitting]);

    async function handleLogout() {
        await requestJson("/auth/logout", { method: "POST" });
        setUser(null);
        setLandingView("landing");
        setAuthDialogOpen(false);
        setAuthMode("login");
        setAuthForm(initialAuthForm);
        setAuthMessage("");
        setSelectedFiles([]);
        setUploadStatuses([]);
        setDocuments([]);
        setActiveDocumentId(null);
        setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
        setActiveCompany(null);
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
            setAuthDialogOpen(false);
            setAuthForm(initialAuthForm);
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
    }, [authDialogOpen, authForm.registrationIntent, authLoading, authMode, handleGoogleLogin, landingView, user]);

    if (authLoading) {
        return <div className="app auth-loading"><div className="loading-card"><div className="brand-mark">₹</div><LoadingIndicator label="Loading your workspace..." /></div></div>;
    }

    if (authError) {
        return <div className="app auth-loading"><div className="loading-card"><StatusMessage message={authError} tone="error" persist /></div></div>;
    }

    if (!user) {
        if (landingView === "landing") {
            return (
                <>
                    <LandingPage onGetStarted={openAuthFlow} showEntryChooser={entryChooserRequest} />
                    <AnimatePresence initial={false}>
                    {authDialogOpen && (
                        <motion.div className="auth-dialog-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <motion.button className="auth-dialog-backdrop" type="button" aria-label="Close registration dialog" onClick={() => !authSubmitting && setAuthDialogOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                            <motion.section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}>
                                <div className="auth-dialog-aside">
                                    <span className="auth-dialog-kicker">Financial Analyzer</span>
                                    <div>
                                        <span className="auth-dialog-icon">₹</span>
                                        <h2>Make your numbers work harder.</h2>
                                        <p>Join a calmer way to understand reports, trends, and the decisions behind them.</p>
                                    </div>
                                    <div className="auth-dialog-proof"><span className="signal-dot" /> Secure workspace for your financial reports</div>
                                </div>
                                <div className="auth-dialog-content">
                                    <button className="auth-close" type="button" aria-label="Close registration dialog" disabled={authSubmitting} onClick={() => setAuthDialogOpen(false)}>×</button>
                                    <span className="eyebrow">{authMode === "login" ? "Welcome back" : "Create a workspace"}</span>
                                    <h2 id="auth-dialog-title">{authMode === "login" ? "Sign in to your workspace" : "Create your account"}</h2>
                                    <p className="auth-dialog-intro">{authMode === "login" ? "Access your financial analysis dashboard." : "Set up your workspace in less than a minute."}</p>
                                    <button type="button" className="auth-back-button" disabled={authSubmitting} onClick={returnToEntryOptions}>← Back to options</button>
                                    <form onSubmit={handleAuthSubmit} className="auth-form">
                                        {authMode === "register" && <label>Name<input name="userName" type="text" placeholder="Your full name" value={authForm.userName} onChange={updateAuthField} required autoComplete="name" /></label>}
                                        <label>{authMode === "login" ? "Email or username" : "Email"}<input name="email" type={authMode === "login" ? "text" : "email"} placeholder={authMode === "login" ? "Email or username" : "you@company.com"} value={authForm.email} onChange={updateAuthField} required autoComplete={authMode === "login" ? "username" : "email"} /></label>
                                        <label>Password<input name="password" type="password" placeholder="At least 8 characters" value={authForm.password} onChange={updateAuthField} required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
                                        {authMode === "register" && <RegistrationFields authForm={authForm} onChange={updateAuthField} />}
                                        <button className="primary-button" type="submit" disabled={authSubmitting}>{authSubmitting ? <LoadingIndicator label={authMode === "login" ? "Logging in..." : "Creating account..."} /> : authMode === "login" ? "Login" : "Create account"}</button>
                                    </form>
                                    {GOOGLE_CLIENT_ID && authForm.registrationIntent === "consumer" && <><div className="auth-divider"><span>or continue with</span></div><div className="google-auth-tools"><div className="google-login-button" ref={googleButtonRef} /><button type="button" className="google-fallback-button" onClick={handleGoogleFallback}><GoogleLogo />{authMode === "login" ? "Sign in with Google" : "Sign up with Google"}</button></div></>}
                                    <StatusMessage message={authMessage} tone="error" />
                                    <div className="auth-switch"><span>{authMode === "login" ? "New to Financial Analyzer?" : "Already have an account?"}</span><button type="button" className="auth-switch-button" aria-label={authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"} disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>{authMode === "login" ? "Create an account" : "Sign in"}</button></div>
                                </div>
                            </motion.section>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </>
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
                        <h2>{authMode === "login" ? "Sign in to your workspace" : "Create your account"}</h2>
                        <p>{authMode === "login" ? "Access your financial analysis dashboard." : "Start turning reports into useful insight."}</p>
                    <button type="button" className="auth-back-button" disabled={authSubmitting} onClick={returnToEntryOptions}>← Back to options</button>
                    <form onSubmit={handleAuthSubmit} className="auth-form">
                        {authMode === "register" && (
                            <label>
                                Name
                                <input name="userName" type="text" placeholder="Your full name" value={authForm.userName} onChange={updateAuthField} required autoComplete="name" />
                            </label>
                        )}
                        <label>
                            {authMode === "login" ? "Email or username" : "Email"}
                            <input name="email" type={authMode === "login" ? "text" : "email"} placeholder={authMode === "login" ? "Email or username" : "you@company.com"} value={authForm.email} onChange={updateAuthField} required autoComplete={authMode === "login" ? "username" : "email"} />
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" placeholder="At least 8 characters" value={authForm.password} onChange={updateAuthField} required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                        </label>
                        {authMode === "register" && <RegistrationFields authForm={authForm} onChange={updateAuthField} />}
                        <button className="primary-button" type="submit" disabled={authSubmitting}>
                            {authSubmitting ? (
                                <LoadingIndicator label={authMode === "login" ? "Logging in..." : "Creating account..."} />
                            ) : authMode === "login" ? "Login" : "Create account"}
                        </button>
                    </form>
                    {GOOGLE_CLIENT_ID && authForm.registrationIntent === "consumer" && <>
                        <div className="auth-divider"><span>or continue with</span></div>
                        <div className="google-auth-tools">
                            <div className="google-login-button" ref={googleButtonRef} />
                            <button type="button" className="google-fallback-button" onClick={handleGoogleFallback}>
                                <GoogleLogo />
                                {authMode === "login" ? "Sign in with Google" : "Sign up with Google"}
                            </button>
                        </div>
                    </>}
                    <StatusMessage message={authMessage} tone="error" />
                    <div className="auth-switch"><span>{authMode === "login" ? "New to Financial Analyzer?" : "Already have an account?"}</span><button type="button" className="auth-switch-button" aria-label={authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"} disabled={authSubmitting} onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>
                        {authMode === "login" ? "Create an account" : "Sign in"}
                    </button></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (window.location.pathname.startsWith("/admin")) {
        if (user.role !== "admin") {
            return <div className="app auth-loading"><div className="loading-card"><StatusMessage message="Admin access required." tone="error" persist /></div></div>;
        }

        return <AdminDashboard user={user} onLogout={handleLogout} />;
    }


    function handleFileChange(event) {
        addFiles(event.target.files);
        event.target.value = "";
    }

    function addFiles(files) {
        const validFiles = Array.from(files || []);
        const invalidFile = validFiles.find(file => !file || typeof file.name !== "string" || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")));
        if (invalidFile) {
            setMessage("Please choose PDF financial reports only.");
            return;
        }

        const oversizedFile = validFiles.find(file => file.size > MAX_UPLOAD_SIZE_BYTES);
        if (oversizedFile) {
            setMessage(`${oversizedFile.name} is larger than 25 MB.`);
            return;
        }

        const newFiles = mergeUniqueFiles(selectedFiles, validFiles);

        setMessage(newFiles.length !== validFiles.length ? "Duplicate PDFs were skipped." : "");
        if (newFiles.length > 0) {
            setIdentityState({ status: "checking", identities: [], error: "Checking report identity..." });
            setSelectedFiles(current => [...current, ...newFiles.map(file => ({ file, name: file.name, size: file.size }))]);
            setUploadStatuses([]);
        }
        if (!activeDocumentId) {
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
        }
        setActiveChart(defaultAnalyticsTab);
    }

    function removeSelectedFile(identity) {
        setSelectedFiles(current => removeFileByIdentity(current, identity));
        setUploadStatuses([]);
        setMessage("");
    }

    function focusAnalytics() {
        const analyticsSection = document.getElementById("analytics");

        analyticsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        analyticsSection?.focus({ preventScroll: true });
    }

    async function handleUpload() {
        if (!canUploadForCompany(activeCompany)) {
            setMessage("You do not have permission to upload documents for this company.");
            return;
        }

        if (selectedFiles.length === 0) {
            setMessage("Please select at least one PDF first.");
            return;
        }

        const filesToUpload = [...selectedFiles];

        setUploading(true);
        setAnalyticsLoading({ assets: false, liabilities: false, profitLoss: false });
        if (!activeDocumentId) {
            setAnalyticsData({ assets: null, liabilities: null, profitLoss: null });
        }
        setActiveChart(defaultAnalyticsTab);
        setUploadStatuses(filesToUpload.map(({ name }) => ({ name, status: "processing" })));
        setMessage(`Uploading ${filesToUpload.length} ${filesToUpload.length === 1 ? "report" : "reports"}...`);

        try {
            const formData = new FormData();
            if (activeCompany?.companyId) {
                formData.append("companyId", String(activeCompany.companyId));
            }
            filesToUpload.forEach(({ file }) => formData.append("files[]", file));

            const uploadResponse = await fetch(`${API_BASE_URL}/documents/upload-batch`, {
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

            const batchDocuments = uploadResult.documents ?? [];
            setUploadStatuses(batchDocuments.map(document => ({
                name: document.filename,
                status: document.status,
                fromCache: document.fromCache,
                error: document.error
            })));
            const { completedDocumentId: nextDocumentId, isProcessing, failure } = getBatchResultState(batchDocuments);

            if (failure) {
                const error = new Error(failure.message);
                Object.assign(error, failure, { isBatchDocumentFailure: true });
                throw error;
            }

            if (!nextDocumentId) {
                if (isProcessing) {
                    setMessage("Reports are still processing. You can return to them from report history.");
                    return;
                }
                throw new Error("No report was processed successfully.");
            }

            setMessage("Processing document...");

            setActiveDocumentId(nextDocumentId);
            await loadAnalytics(nextDocumentId, activeCompany?.companyId);
            const documentsPath = activeCompany?.companyId
                ? `/documents?companyId=${encodeURIComponent(activeCompany.companyId)}`
                : "/documents";
            const documentsResult = await requestJson(documentsPath);
            setDocuments(documentsResult.documents ?? []);
            await loadQuota();
            setMessage("Balance sheet analytics loaded successfully.");
            setSelectedFiles([]);
            setUploadStatuses([]);
            focusAnalytics();
        } catch (error) {
            console.error("Upload / analytics error:", error);
            if (!error.isBatchDocumentFailure) {
                setUploadStatuses(filesToUpload.map(({ name }) => ({ name, status: "failed", error: error.message || "Upload failed." })));
            }
            if (error.code === "UPLOAD_QUOTA_EXCEEDED") {
                setQuota({
                    plan: error.plan ?? quota?.plan,
                    uploadsUsed: error.uploadsUsed ?? quota?.uploadsUsed,
                    uploadQuota: error.uploadQuota ?? quota?.uploadQuota,
                });
                setCheckoutError("");
                setQuotaModalOpen(true);
                setMessage("");
            } else {
                setMessage(error.isBatchDocumentFailure ? `Unable to upload document: ${error.message || "Upload failed."}` : error.message || "Unable to load balance sheet analytics. Please try again.");
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

    function handleCompanySelect(companyId) {
        const company = companies.find(item => String(item.companyId) === String(companyId));
        if (!company || String(activeCompany?.companyId) === String(company.companyId)) return;
        setActiveCompany(toActiveCompany(company));
        setSelectedFiles([]);
        setIdentityState({ status: "idle", identities: [], error: "" });
        setUploadStatuses([]);
        setUploading(false);
        setReportMenuOpen(false);
        setMessage("");
    }

    function handleDrop(event) {
        event.preventDefault();
        if (!uploading) {
            addFiles(event.dataTransfer.files);
        }
    }

    const analyticsReady = analyticsData.assets && analyticsData.liabilities;
    const canUploadActiveCompany = canUploadForCompany(activeCompany);
    const analyticsBusy = analyticsLoading.assets || analyticsLoading.liabilities;
    const keyMetrics = analyticsData.profitLoss?.keyMetrics;
    const historicalData = selectHistoricalData(analyticsData.profitLoss);
    const activeAnalyticsTab = visibleAnalyticsTabs.some(tab => isAnalyticsTabActive(tab, activeChart))
        ? activeChart
        : defaultAnalyticsTab;
    const dayPart = currentDayPart;
    const firstName = String(user.userName || "there").trim().split(/\s+/)[0];
    const companies = getUserCompanies(user);
    const dayPartCopy = {
        morning: "Start the day with a clear view of your numbers.",
        afternoon: "Keep your financial decisions moving with confidence.",
        evening: "Close the day knowing what your numbers are saying.",
        night: "A clear financial view, whenever your next decision calls.",
    }[dayPart];
    const workspaceReveal = prefersReducedMotion
        ? { initial: false, animate: { opacity: 1, y: 0 } }
        : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
    const workspaceTransition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
    const workspaceStagger = { animate: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } } };

    return (
        <div className={`app workspace-app ${darkMode ? "theme-dark" : ""}`}>
            {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
            {mobileNavOpen && <nav className="mobile-nav-drawer" aria-label="Mobile navigation"><div className="mobile-drawer-head"><strong>Financial Analyzer</strong><button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><span className="close-icon" aria-hidden="true"><span /><span /></span></button></div><a href="#dashboard" onClick={() => setMobileNavOpen(false)}>Dashboard</a><a href="#upload" onClick={() => setMobileNavOpen(false)}>Upload a financial report</a><a href="#analytics" onClick={() => setMobileNavOpen(false)}>Analytics</a><button className="mobile-report-toggle" onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen}>Report history <span aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>{reportHistoryOpen && <div className="mobile-report-history">{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p></div> : <div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { handleDocumentSelect(document.id); setMobileNavOpen(false); }}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div>}</div>}<CompanyAccessSection companies={companies} activeCompanyId={activeCompany?.companyId} expanded={companiesOpen} onToggle={() => setCompaniesOpen(open => !open)} expandedCompanies={expandedCompanies} onSelectCompany={companyId => { handleCompanySelect(companyId); setMobileNavOpen(false); }} onToggleCompany={companyId => setExpandedCompanies(current => ({ ...current, [companyId]: !current[companyId] }))} idPrefix="mobile" /><button className="mobile-logout" onClick={() => { setMobileNavOpen(false); handleLogout(); }}>Log out</button></nav>}
            <aside className="sidebar">
                <div className="brand-lockup"><span className="brand-mark">₹</span><strong>Financial<br />Analyzer</strong></div>
                <div className="sidebar-label">Workspace</div>
                <nav className="main-nav" aria-label="Main navigation">
                    <a className={`nav-item ${activeSection === "#dashboard" ? "is-active" : ""}`} href="#dashboard" aria-current={activeSection === "#dashboard" ? "page" : undefined}><NavIcon>+</NavIcon>Dashboard{activeSection === "#dashboard" && <motion.span className="nav-active-indicator" layoutId="nav-active-indicator" />}</a>
                    <a className={`nav-item ${activeSection === "#upload" ? "is-active" : ""}`} href="#upload" aria-current={activeSection === "#upload" ? "page" : undefined}><NavIcon>[]</NavIcon>Upload a financial report{activeSection === "#upload" && <motion.span className="nav-active-indicator" layoutId="nav-active-indicator" />}</a>
                    <a className={`nav-item ${activeSection === "#analytics" ? "is-active" : ""}`} href="#analytics" aria-current={activeSection === "#analytics" ? "page" : undefined}><NavIcon>~</NavIcon>Analytics{activeSection === "#analytics" && <motion.span className="nav-active-indicator" layoutId="nav-active-indicator" />}</a>
                    <button id="documents" className={`nav-item nav-button report-history-toggle ${reportHistoryOpen ? "is-open" : ""}`} onClick={() => setReportHistoryOpen(open => !open)} aria-expanded={reportHistoryOpen} aria-controls="sidebar-report-history"><NavIcon>{reportHistoryOpen ? "-" : "+"}</NavIcon>Report history<span className="nav-chevron" aria-hidden="true">{reportHistoryOpen ? "⌃" : "⌄"}</span></button>
                    {reportHistoryOpen && <div className="sidebar-report-history" id="sidebar-report-history"><div className="history-heading"><div><span className="eyebrow">Report history</span><h3>Reports</h3></div><span className="history-count">{documents.length}</span></div>{documents.length === 0 && !documentsLoading ? <div className="history-empty"><strong>No reports yet</strong><p>Upload a financial report to start your analysis.</p><a href="#upload">Upload PDF</a></div> : <><button className={`report-selector ${reportMenuOpen ? "is-open" : ""}`} onClick={() => setReportMenuOpen(open => !open)} aria-expanded={reportMenuOpen} disabled={documentsLoading}><span>{documents.find(document => document.id === activeDocumentId)?.original_filename || "Select report"}</span><span aria-hidden="true">⌄</span></button>{reportMenuOpen && <div className="report-menu"><span className="report-menu-label">Select report</span>{documents.map((document, index) => <button className={`report-option ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => { setReportMenuOpen(false); handleDocumentSelect(document.id); }}><span>{document.id === activeDocumentId ? "✓" : ""}</span><span className="report-option-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}{document.extraction_status ? ` · ${document.extraction_status}` : ""}</small></span>{index === 0 && <em>Latest</em>}</button>)}</div>}<div className="history-list">{documents.map((document, index) => <button className={`history-item ${document.id === activeDocumentId ? "is-selected" : ""}`} key={document.id} onClick={() => handleDocumentSelect(document.id)}><span className="history-item-copy"><strong>{document.original_filename}</strong><small>{formatDocumentDate(document.uploaded_at || document.linked_at)}</small></span><span className="history-item-meta">{index === 0 && <em>Latest</em>}{document.extraction_status && <small>{document.extraction_status}</small>}</span></button>)}</div></>}</div>}
                                    <CompanyAccessSection companies={companies} activeCompanyId={activeCompany?.companyId} expanded={companiesOpen} onToggle={() => setCompaniesOpen(open => !open)} expandedCompanies={expandedCompanies} onSelectCompany={handleCompanySelect} onToggleCompany={companyId => setExpandedCompanies(current => ({ ...current, [companyId]: !current[companyId] }))} />
                </nav>
                <div className="sidebar-footer"><div className="sidebar-label">Account</div><button className="nav-item nav-button" onClick={handleLogout}><NavIcon>&gt;</NavIcon>Log out</button></div>
            </aside>
            <main className="workspace-main">
                <header className="topbar">
                    <button className={`mobile-menu ${mobileNavOpen ? "is-open" : ""}`} onClick={() => setMobileNavOpen(open => !open)} aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen}><span className="hamburger-icon" aria-hidden="true"><span /><span /><span /></span></button>
                                        <div>{activeCompany ? <span className="topbar-kicker">Workspace / {activeCompany.companyName}</span> : <span className="topbar-kicker">Account overview</span>}<h1>{activeCompany ? "Dashboard" : `Welcome, ${firstName}`}</h1></div>
                    <div className="topbar-actions">
                        <button className="theme-toggle" onClick={() => setDarkMode(mode => !mode)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={darkMode}><span className="theme-toggle-icon" aria-hidden="true">{darkMode ? "☀" : "◐"}</span><span>{darkMode ? "Light mode" : "Dark mode"}</span></button>
                        <div className="account-controls"><div className="avatar" title={`${user.userName || "Account"}${user.email ? ` - ${user.email}` : ""}`} aria-label={`${user.userName || "Account"}${user.email ? `, ${user.email}` : ""}`}>{String(user.userName || "U").slice(0, 1).toUpperCase()}</div><div className="account-copy"><strong>{user.userName}</strong><span>{user.email}</span></div><button onClick={handleLogout} className="logout-button">Log out</button></div>
                    </div>
                </header>
                <div className="content-grid" id="dashboard">
                    <motion.section className={`welcome-panel welcome-panel-${dayPart}`} {...workspaceReveal} transition={workspaceTransition}>
                        <video className="welcome-photo" src={workspaceWelcomeVideo} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
                        <div className="welcome-copy"><div className="welcome-meta"><span className="eyebrow">{dayPart === "night" ? "After-hours financial intelligence" : "Your financial intelligence desk"}</span></div><h2>{dayPart === "morning" ? "Good morning" : dayPart === "afternoon" ? "Good afternoon" : "Good evening"}, {firstName}.</h2><p>{documents.length > 0 ? `${dayPartCopy} Your available reports are ready to review.` : canUploadActiveCompany ? `${dayPartCopy} You can upload your own PDF for analysis.` : companies.length > 0 ? `${dayPartCopy} Your assigned company reports will appear here when available.` : "Ask your administrator to assign a company workspace to view shared reports."}</p>{documents.length > 0 ? <a className="welcome-action" href="#analytics">View reports <span aria-hidden="true">→</span></a> : canUploadActiveCompany ? <a className="welcome-action" href="#upload">Upload a report <span aria-hidden="true">→</span></a> : companies.length > 0 ? <span className="welcome-action welcome-action-disabled">Waiting for reports</span> : <span className="welcome-action welcome-action-disabled">Contact your administrator</span>}</div>
                        <div className="welcome-mark" aria-hidden="true"><span>+12.8%</span><i /></div>
                    </motion.section>
                    {documents.length > 0 && <motion.section className="kpi-grid" aria-label="Workspace summary" variants={workspaceStagger} initial={workspaceReveal.initial} animate={workspaceReveal.animate}>
                        <motion.div className="kpi-card" variants={workspaceReveal} transition={workspaceTransition}><span className="kpi-label">Reports available</span><motion.strong key={documents.length} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{documents.length}</motion.strong><span className="kpi-foot">Available to your account</span></motion.div>
                        <motion.div className="kpi-card" variants={workspaceReveal} transition={workspaceTransition}><span className="kpi-label">Analytics status</span><motion.strong key={analyticsReady ? "ready" : uploading || analyticsBusy ? "processing" : "waiting"} className={analyticsReady ? "status-ready" : uploading || analyticsBusy ? "status-processing" : "status-waiting"} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{analyticsReady ? "Ready" : uploading || analyticsBusy ? "Processing" : "Waiting"}</motion.strong><span className="kpi-foot">Financial insights</span></motion.div>
                        <motion.div className="kpi-card" variants={workspaceReveal} transition={workspaceTransition}><span className="kpi-label">Latest report</span><motion.strong key={documents[0]?.original_filename || "--"} title={documents[0]?.original_filename} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{documents[0]?.original_filename || "--"}</motion.strong><span className="kpi-foot">PDF document</span></motion.div>
                    </motion.section>}
                    <motion.section key={`upload-${activeSection === "#upload"}`} className="upload-section" id="upload" {...workspaceReveal} transition={{ ...workspaceTransition, delay: 0.08 }}>
                        <SectionHeader eyebrow={canUploadActiveCompany ? "Get started" : activeCompany ? "Read only" : "Access required"} title={canUploadActiveCompany ? "Upload a financial report" : activeCompany ? "Company documents are read-only" : "Company access is required"} description={canUploadActiveCompany ? "Drop a PDF here to unlock your financial insights." : activeCompany ? "You can view this company's documents and analytics, but only an OWNER can upload reports." : "Contact your administrator to view shared company reports."} />
                        <div className={`upload-zone ${selectedFiles.length ? "has-file" : ""} ${!canUploadActiveCompany ? "is-read-only" : ""}`} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
                            <input id="file-upload" ref={fileInputRef} className="file-input" type="file" accept=".pdf,application/pdf" multiple onChange={handleFileChange} disabled={!canUploadActiveCompany || uploading} />
                            {canUploadActiveCompany ? <label htmlFor="file-upload" className="upload-zone-content"><span className="upload-icon">↑</span><strong>{selectedFiles.length ? "Add more PDF reports" : "Drop your reports here"}</strong><span>{selectedFiles.length ? `${selectedFiles.length} ${selectedFiles.length === 1 ? "report" : "reports"} selected` : "or browse from your device"}</span><small>PDF files up to 25 MB each</small></label> : activeCompany ? <div className="upload-zone-content"><span className="upload-icon" aria-hidden="true">✓</span><strong>View existing reports</strong><span>Upload is available to OWNER members</span><small>Documents and analytics remain available below</small></div> : <div className="upload-zone-content"><span className="upload-icon" aria-hidden="true">i</span><strong>View-only account</strong><span>Reports and analytics will appear after an administrator assigns a company</span><small>Contact your administrator for access</small></div>}
                            {selectedFiles.length > 0 && <div className="selected-files selected-file-preview selected-files-in-zone" aria-label="Selected reports"><div className="selected-file-grid">{selectedFiles.map(({ file, name, size }) => { const identity = `${file.name}:${file.size}:${file.lastModified}`; return <div className="selected-file selected-file-card" key={identity} title={name}><span className="selected-file-icon" aria-hidden="true">PDF</span><strong title={name}>{name}</strong><small>{formatFileSize(size)}</small><button type="button" onClick={() => removeSelectedFile(identity)} disabled={uploading} aria-label={`Remove ${name}`} title={`Remove ${name}`}><span aria-hidden="true">−</span></button></div>; })}</div></div>}
                        </div>
                        <AnimatePresence initial={false} mode="popLayout">
                            {uploadStatuses.length > 0 && <motion.div className="selected-files" aria-label="Upload progress" initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={workspaceTransition}><div className="selected-files-heading">{uploadStatuses.some(status => status.status === "failed") ? "Upload results" : "Analyzing reports"}</div>{uploadStatuses.map(({ name, status, fromCache, error }, index) => <motion.div className="selected-file" layout key={`${name}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} transition={workspaceTransition}><span><strong>{name}</strong><small>{fromCache ? "Reused existing document" : status === "processing" ? "Processing" : error || status}</small></span></motion.div>)}</motion.div>}
                            {(identityState.status !== "idle" && !(identityState.status === "verified" && selectedFiles.length === 1)) && <motion.div className={`identity-status identity-status-${identityState.status}`} aria-live="polite" initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={workspaceTransition}>{identityState.status === "verified" && selectedFiles.length > 1 ? <><strong>Reports verified</strong><span>Same company · CIN matched</span></> : identityState.status === "conflict" ? <><strong>Reports don't belong to the same company</strong><span>{identityState.error}</span></> : identityState.status === "incomplete" || identityState.status === "error" ? <><strong>Company identity could not be verified</strong><span>{identityState.error}</span></> : identityState.status === "checking" ? <span>Checking report identity...</span> : null}</motion.div>}
                        </AnimatePresence>
                                        <div className="upload-actions"><button className="primary-button upload-button" onClick={handleUpload} disabled={!canUploadActiveCompany || !canAnalyzeFiles(selectedFiles, uploading, identityState)}>{uploading ? <LoadingIndicator label="Processing reports..." /> : "Analyze report"}</button>{selectedFiles.length > 0 && !uploading && !uploadStatuses.some(status => status.status === "failed") && <span className="file-status"><span className="status-dot" /> {canAnalyzeFiles(selectedFiles, uploading, identityState) ? "Ready to analyze" : "Identity verification required"}</span>}</div>
                        <StatusMessage
                            message={message}
                            loading={uploading || analyticsBusy || documentsLoading}
                            tone={message.includes("Unable") || message.includes("Please") || message.includes("permission") ? "error" : undefined}
                            loadingMessages={[
                                message || "Preparing your workspace...",
                                "Reading the report structure...",
                                "Extracting financial statements...",
                                "Building your financial insights...",
                            ]}
                        />
                    </motion.section>
                    {documents.length > 0 && <motion.section key={`analytics-${activeSection === "#analytics"}`} className="insights-section" id="analytics" tabIndex="-1" {...workspaceReveal} transition={{ ...workspaceTransition, delay: 0.12 }}>
                        <div className="insights-heading-row">
                            <SectionHeader eyebrow="Financial intelligence" title="Explore your report" description="Switch between financial position and profitability without leaving the workspace." />
                            <div className="insight-mode-switcher" style={{ "--analytics-tab-count": visibleAnalyticsTabs.length }} role="tablist" aria-label="Financial intelligence views">
                                {visibleAnalyticsTabs.map(tab => (
                                    <button className={isAnalyticsTabActive(tab, activeAnalyticsTab) ? "is-active" : ""} onClick={() => setActiveChart(tab.value)} key={tab.id} role="tab" aria-selected={isAnalyticsTabActive(tab, activeAnalyticsTab)}>
                                        <strong>{tab.label}</strong><span>{tab.subtitle}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="insights-workspace" id="insights-content">
                            <div className="insight-workspace-main">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={`${activeAnalyticsTab}-${activeChart}`}
                                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                                        transition={workspaceTransition}
                                    >
                                {activeAnalyticsTab === "balanceSheet1A" ? (
                                    <BalanceSheet1A assets={analyticsData.assets} liabilities={analyticsData.liabilities} loading={analyticsLoading.assets || analyticsLoading.liabilities} />
                                ) : activeAnalyticsTab === "profitLoss1A" ? (
                                    <ProfitLoss1A analyticsData={analyticsData.profitLoss} loading={analyticsLoading.profitLoss} />
                                ) : activeAnalyticsTab === "keyMetrics1A" ? (
                                    <section className="key-metrics-1a-view" aria-label="Key Metrics 1A">
                                        <KeyMetrics1A historicalData={historicalData} loading={analyticsLoading.profitLoss} />
                                    </section>
                                ) : activeChart === "keyMetrics" ? (
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
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.section>}
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