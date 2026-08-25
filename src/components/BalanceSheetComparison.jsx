import { memo } from "react";

import { deriveFinancialPeriods, getFinancialMetric, formatFinancialValue } from "../utils/financialStatementData";

function getChange(current, previous) {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
}

function formatChange(change) {
    if (change === null) return "No comparison";
    return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% year on year`;
}

function formatBalanceValue(value, suffix = "") {
    return value === null ? "Unavailable" : `${formatFinancialValue(value)}${suffix}`;
}

function getCalculatedMetric(keyMetrics, metricName) {
    const metric = keyMetrics?.[metricName];
    return metric?.status === "calculated" && Number.isFinite(Number(metric.value)) ? Number(metric.value) : null;
}

function BalanceSheetComparison({ assets, liabilities, profitLoss, keyMetrics }) {
    const periods = deriveFinancialPeriods(assets, liabilities, profitLoss);
    const currentPeriod = periods[0];
    const previousPeriod = periods[1];
    const currentRatio = getCalculatedMetric(keyMetrics, "currentRatio");
    const ratio = currentRatio;
    const debtToEquity = getCalculatedMetric(keyMetrics, "debtToEquity");

    if (periods.length === 0) {
        return <div className="chart-empty"><strong>Comparison unavailable</strong><p>No comparable values are available in the analytics response.</p></div>;
    }

    const overviewRows = [
        ["Total assets", assets, "totalAssets"],
        ["Total liabilities", liabilities, "totalLiabilities"],
        ["Net worth / equity", liabilities, "totalEquity"],
    ].map(([label, source, metricName]) => ({
        label,
        current: getFinancialMetric(source, metricName, currentPeriod),
        previous: getFinancialMetric(source, metricName, previousPeriod),
    }));
    const equityChange = getChange(overviewRows[2].current, overviewRows[2].previous);
    const healthInsights = [
        equityChange !== null && equityChange > 0
            ? { tone: "positive", label: "Positive", text: `Net worth increased by ${equityChange.toFixed(1)}%.` }
            : null,
        equityChange !== null && equityChange < 0
            ? { tone: "attention", label: "Watch", text: `Net worth decreased by ${Math.abs(equityChange).toFixed(1)}%.` }
            : null,
        ratio !== null && keyMetrics?.currentRatio?.previousValue !== null && keyMetrics?.currentRatio?.previousValue !== undefined && ratio < Number(keyMetrics.currentRatio.previousValue)
            ? { tone: "attention", label: "Watch", text: "Current ratio decreased from the previous period." }
            : null,
        ratio !== null && ratio < 1
            ? { tone: "risk", label: "Risk", text: "Short-term obligations exceed current assets." }
            : null,
        debtToEquity !== null && debtToEquity > 2
            ? { tone: "risk", label: "Risk", text: "Borrowings are high relative to equity." }
            : null,
    ].filter(Boolean);

    return (
        <div className="balance-sheet-comparison">
            <section className="balance-sheet-overview" aria-labelledby="balance-sheet-overview-title">
                <div className="balance-sheet-section-heading">
                    <div><span className="eyebrow">Balance sheet overview</span><h3 id="balance-sheet-overview-title">Financial position</h3><p>{currentPeriod} compared with {previousPeriod || "the prior period"}. Key Metrics and breakdown tabs contain the supporting detail.</p></div>
                </div>
                <div className="balance-sheet-overview-grid">
                    {overviewRows.map(row => (
                        <article className="balance-sheet-overview-card" key={row.label}><span>{row.label}</span><strong>{formatBalanceValue(row.current)}</strong><small>{formatChange(getChange(row.current, row.previous))}</small></article>
                    ))}
                </div>
            </section>
            <section className="balance-sheet-health-insights" aria-labelledby="balance-sheet-health-title">
                <div className="balance-sheet-section-heading"><div><span className="eyebrow">Financial health insights</span><h3 id="balance-sheet-health-title">What stands out</h3></div></div>
                {healthInsights.length > 0 ? <div className="balance-sheet-health-list">{healthInsights.map(insight => <article className={`balance-sheet-health-card is-${insight.tone}`} key={`${insight.label}-${insight.text}`}><strong>{insight.label}</strong><span>{insight.text}</span></article>)}</div> : <p className="balance-sheet-health-empty">No health signals are available for the selected periods.</p>}
            </section>
        </div>
    );
}

export default memo(BalanceSheetComparison);
