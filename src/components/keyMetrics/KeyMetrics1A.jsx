import { useState } from "react";

import MetricDetailsPanel from "./MetricDetailsPanel";
import { formatHistoricalValue, getComparisonState, getHistoricalRows } from "./keyMetrics1AData";
import { getAnalyticsTab } from "../../config/analyticsTabs.config";

function KeyMetrics1A({ historicalData = null, loading = false, error = false }) {
    const [selectedMetric, setSelectedMetric] = useState(null);
    const heading = getAnalyticsTab("keyMetrics1A")?.heading ?? {};
    if (loading) {
        return <div className="key-metrics-1a-state" role="status">Loading financial intelligence...</div>;
    }

    if (error) {
        return <div className="key-metrics-1a-state key-metrics-1a-error" role="alert">Unable to load historical financial intelligence.</div>;
    }

    const years = historicalData?.availableYears ?? [];
    const rows = getHistoricalRows(historicalData);

    if (years.length === 0 || rows.length === 0) {
        return (
            <div className="key-metrics-1a-empty">
                <strong>Historical financial intelligence</strong>
                <p>will appear here after the uploaded reports are consolidated.</p>
            </div>
        );
    }

    return (
        <div className="key-metrics-1a-table-wrap">
            <span className="eyebrow">{heading.eyebrow}</span>
            <h2>{heading.title}</h2>
            <p className="key-metrics-1a-description">{heading.description}</p>
            <table className="key-metrics-1a-table">
                <thead>
                    <tr>
                        <th scope="col">Metric</th>
                        {years.map(year => <th scope="col" key={year}>{year}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const comparison = getComparisonState(row, years);
                        return (
                            <tr key={row.metricName}>
                                <th scope="row">{row.label}</th>
                                {years.map(year => (
                                    <td className={year === comparison.currentPeriod ? `is-current is-${comparison.state}` : undefined} data-period={year} key={year}>
                                        <span>{formatHistoricalValue(row.values?.[year], row.unit)}</span>
                                        {year === comparison.currentPeriod && <span className="key-metrics-1a-comparison" aria-label={comparison.label} title={comparison.label}>{comparison.arrow} <small>{comparison.label}</small></span>}
                                        {year === comparison.currentPeriod && row.calculation && <button type="button" className="key-metrics-1a-details" onMouseEnter={() => setSelectedMetric(row)} onFocus={() => setSelectedMetric(row)} onClick={() => setSelectedMetric(row)} aria-label={`View calculation details for ${row.label}`}>Details</button>}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {selectedMetric && <MetricDetailsPanel metric={selectedMetric} onClose={() => setSelectedMetric(null)} />}
        </div>
    );
}

export default KeyMetrics1A;