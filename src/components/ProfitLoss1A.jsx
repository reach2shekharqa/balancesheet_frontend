import { useState } from "react";

import ProfitLossExpensesChart from "./ProfitLossExpensesChart";
import MultiPeriodComparisonChart from "./MultiPeriodComparisonChart";
import { deriveFinancialPeriods } from "../utils/financialStatementData";
import { getAnalyticsTab } from "../config/analyticsTabs.config";

function ProfitLoss1A({ analyticsData, loading = false }) {
    const heading = getAnalyticsTab("profitLoss1A")?.heading ?? {};
    const periods = deriveFinancialPeriods(analyticsData);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [activeView, setActiveView] = useState("comparison");
    const displayedPeriod = periods.includes(selectedPeriod) ? selectedPeriod : periods[0] ?? null;

    if (loading) {
        return <div className="profit-loss-1a-state" role="status">Loading profit and loss...</div>;
    }

    if (periods.length === 0) {
        return <div className="profit-loss-1a-state">No profit and loss periods are available.</div>;
    }

    return (
        <section className="profit-loss-1a" aria-label="Profit and Loss 1A">
            <div className="profit-loss-1a-heading">
                <div>
                    <span className="eyebrow">{heading.eyebrow}</span>
                    <h2>{heading.title}</h2>
                    <p>{heading.description}</p>
                </div>
                {activeView === "breakdown" && <label className="period-selector">
                    <span>Financial Year</span>
                    <select value={displayedPeriod ?? ""} onChange={event => setSelectedPeriod(event.target.value)} aria-label="Financial Year">
                        {periods.map(period => <option key={period} value={period}>{period}</option>)}
                    </select>
                </label>}
            </div>
            <div className="analytics-tabs profit-loss-1a-tabs" role="tablist" aria-label="Profit and loss 1A views">
                <button className={activeView === "comparison" ? "is-active" : ""} onClick={() => setActiveView("comparison")} role="tab" aria-selected={activeView === "comparison"}>Comparison</button>
                <button className={activeView === "breakdown" ? "is-active" : ""} onClick={() => setActiveView("breakdown")} role="tab" aria-selected={activeView === "breakdown"}>Expense breakdown</button>
            </div>
            {activeView === "comparison" ? (
                <section className="chart-panel comparison-chart-panel" aria-label="Profit and loss multi-period comparison">
                    <MultiPeriodComparisonChart
                        title="Profit & Loss comparison"
                        subtitle="Revenue and profitability across available periods"
                        sources={[analyticsData]}
                        seriesDefinitions={[
                            { source: analyticsData, metricName: "revenueFromOperations", label: "Revenue", color: "#1769d4" },
                            { source: analyticsData, metricName: "profitBeforeTax", label: "Profit before tax", color: "#d68a3f" },
                            { source: analyticsData, metricName: "profitAfterTax", label: "Profit after tax", color: "#16845b" },
                        ]}
                    />
                </section>
            ) : (
                <section className="chart-panel" aria-label={`Expenses for ${displayedPeriod}`}>
                    <ProfitLossExpensesChart analyticsData={analyticsData} selectedYear={displayedPeriod} />
                </section>
            )}
        </section>
    );
}

export default ProfitLoss1A;
