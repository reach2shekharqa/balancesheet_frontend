import KeyMetricCard from "./KeyMetricCard";

function KeyMetricsGrid({ keyMetrics }) {
    const metrics = Object.entries(keyMetrics ?? {});

    if (metrics.length === 0) {
        return <div className="key-metrics-empty">Key metrics are unavailable for this report.</div>;
    }

    return (
        <div className="key-metrics-grid">
            {metrics.map(([metricName, metric]) => (
                <KeyMetricCard key={metricName} metric={metric} />
            ))}
        </div>
    );
}

export default KeyMetricsGrid;
