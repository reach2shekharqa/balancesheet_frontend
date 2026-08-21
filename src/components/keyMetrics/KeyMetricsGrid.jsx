import { useState } from "react";

import KeyMetricCard from "./KeyMetricCard";

function KeyMetricsGrid({ keyMetrics }) {
    const metrics = Object.entries(keyMetrics ?? {});
    const [expandedMetric, setExpandedMetric] = useState(null);

    if (metrics.length === 0) {
        return <div className="key-metrics-empty">Key metrics are unavailable for this report.</div>;
    }

    return (
        <div className="key-metrics-grid">
            {metrics.map(([metricName, metric]) => (
                <KeyMetricCard
                    key={metricName}
                    metric={metric}
                    isExpanded={expandedMetric === metricName}
                    onToggle={isOpen => setExpandedMetric(isOpen ? metricName : null)}
                />
            ))}
        </div>
    );
}

export default KeyMetricsGrid;
