import { useState } from "react";

import AssetsBreakdownChart from "./AssetsBreakdownChart";
import LiabilitiesBreakdownChart from "./LiabilitiesBreakdownChart";
import MultiPeriodComparisonChart from "./MultiPeriodComparisonChart";
import { deriveFinancialPeriods } from "../utils/financialStatementData";
import { getAnalyticsTab } from "../config/analyticsTabs.config";

function BalanceSheet1A({ assets, liabilities, loading = false }) {
    const heading = getAnalyticsTab("balanceSheet1A")?.heading ?? {};
    const periods = deriveFinancialPeriods(assets, liabilities);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [activeView, setActiveView] = useState("comparison");
    const displayedPeriod = periods.includes(selectedPeriod) ? selectedPeriod : periods[0] ?? null;

    if (loading) {
        return <div className="balance-sheet-1a-state" role="status">Loading balance sheet...</div>;
    }

    if (periods.length === 0) {
        return <div className="balance-sheet-1a-state">No balance sheet periods are available.</div>;
    }

    return (
        <section className="balance-sheet-1a" aria-label="Balance Sheet 1A">
            <div className="balance-sheet-1a-heading">
                <div>
                    <span className="eyebrow">{heading.eyebrow}</span>
                    <h2>{heading.title}</h2>
                    <p>{heading.description}</p>
                </div>
                {activeView !== "comparison" && <label className="period-selector">
                    <span>Financial Year</span>
                    <select value={displayedPeriod ?? ""} onChange={event => setSelectedPeriod(event.target.value)} aria-label="Financial Year">
                        {periods.map(period => <option key={period} value={period}>{period}</option>)}
                    </select>
                </label>}
            </div>
            <div className="analytics-tabs balance-sheet-1a-tabs" role="tablist" aria-label="Balance sheet 1A views">
                <button className={activeView === "comparison" ? "is-active" : ""} onClick={() => setActiveView("comparison")} role="tab" aria-selected={activeView === "comparison"}>Comparison</button>
                <button className={activeView === "assets" ? "is-active" : ""} onClick={() => setActiveView("assets")} role="tab" aria-selected={activeView === "assets"}>Assets breakdown</button>
                <button className={activeView === "liabilities" ? "is-active" : ""} onClick={() => setActiveView("liabilities")} role="tab" aria-selected={activeView === "liabilities"}>Liabilities breakdown</button>
            </div>
            {activeView === "comparison" ? (
                <section className="chart-panel comparison-chart-panel" aria-label="Balance sheet multi-period comparison">
                    <MultiPeriodComparisonChart
                        title="Balance sheet comparison"
                        subtitle="Assets, liabilities and equity across available periods"
                        sources={[assets, liabilities]}
                        seriesDefinitions={[
                            { source: assets, metricName: "totalAssets", label: "Total assets", color: "#1769d4" },
                            { source: liabilities, metricName: "totalLiabilities", label: "Total liabilities", color: "#d66b58" },
                            { source: liabilities, metricName: "totalEquity", label: "Total equity", color: "#16845b" },
                        ]}
                    />
                </section>
            ) : activeView === "assets" ? (
                <section className="chart-panel" aria-label={`Assets for ${displayedPeriod}`}>
                    <AssetsBreakdownChart analyticsData={assets} selectedYear={displayedPeriod} />
                </section>
            ) : (
                <section className="chart-panel" aria-label={`Liabilities for ${displayedPeriod}`}>
                    <LiabilitiesBreakdownChart analyticsData={liabilities} selectedYear={displayedPeriod} />
                </section>
            )}
        </section>
    );
}

export default BalanceSheet1A;
