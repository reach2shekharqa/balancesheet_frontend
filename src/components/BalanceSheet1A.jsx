import { useState } from "react";

import AssetsBreakdownChart from "./AssetsBreakdownChart";
import LiabilitiesBreakdownChart from "./LiabilitiesBreakdownChart";
import BalanceSheetComparison from "./BalanceSheetComparison";
import { deriveFinancialPeriods } from "../utils/financialStatementData";
import { getAnalyticsSections } from "../utils/analyticsData";
import { getAnalyticsTab } from "../config/analyticsTabs.config";

function BalanceSheet1A({ assets, liabilities, profitLoss, keyMetrics, loading = false }) {
    const heading = getAnalyticsTab("balanceSheet1A")?.heading ?? {};
    const periods = deriveFinancialPeriods(assets, liabilities);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [activeView, setActiveView] = useState("comparison");
    const [assetSectionId, setAssetSectionId] = useState(null);
    const [liabilitySectionId, setLiabilitySectionId] = useState(null);
    const assetSections = getAnalyticsSections(assets);
    const liabilitySections = getAnalyticsSections(liabilities);
    const activeAssetSectionId = assetSections.some(section => section.id === assetSectionId)
        ? assetSectionId
        : assetSections[0]?.id;
    const activeLiabilitySectionId = liabilitySections.some(section => section.id === liabilitySectionId)
        ? liabilitySectionId
        : liabilitySections[0]?.id;
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
                    <BalanceSheetComparison assets={assets} liabilities={liabilities} profitLoss={profitLoss} keyMetrics={keyMetrics} />
                </section>
            ) : activeView === "assets" ? (
                <section className="chart-panel" aria-label={`Assets for ${displayedPeriod}`}>
                    <div className="analytics-tabs balance-sheet-1a-tabs" role="tablist" aria-label="Asset sections">
                        {assetSections.map(section => <button key={section.id} className={activeAssetSectionId === section.id ? "is-active" : ""} onClick={() => setAssetSectionId(section.id)} role="tab" aria-selected={activeAssetSectionId === section.id}>{section.label}</button>)}
                    </div>
                    <AssetsBreakdownChart analyticsData={assets} selectedYear={displayedPeriod} sectionId={activeAssetSectionId} />
                </section>
            ) : (
                <section className="chart-panel" aria-label={`Liabilities for ${displayedPeriod}`}>
                    <div className="analytics-tabs balance-sheet-1a-tabs" role="tablist" aria-label="Liability sections">
                        {liabilitySections.map(section => <button key={section.id} className={activeLiabilitySectionId === section.id ? "is-active" : ""} onClick={() => setLiabilitySectionId(section.id)} role="tab" aria-selected={activeLiabilitySectionId === section.id}>{section.label}</button>)}
                    </div>
                    <LiabilitiesBreakdownChart analyticsData={liabilities} selectedYear={displayedPeriod} sectionId={activeLiabilitySectionId} />
                </section>
            )}
        </section>
    );
}

export default BalanceSheet1A;
