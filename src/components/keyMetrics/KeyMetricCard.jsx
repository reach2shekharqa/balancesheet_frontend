import keyMetricConfig from "./keyMetricConfig";

function formatMetricValue(metric, config) {
    if (metric?.status !== "calculated" || !Number.isFinite(Number(metric.value))) {
        return "N/A";
    }

    const value = Number(metric.value);
    const formattedValue = value.toFixed(2);

    if (config.format === "percentage") {
        return `${value > 0 ? "+" : ""}${formattedValue}%`;
    }

    if (config.format === "ratio") {
        return `${formattedValue}x`;
    }

    if (config.format === "currency") {
        return `${metric.currencySymbol ?? ""}${formattedValue}`;
    }

    if (config.format === "eps") {
        return formattedValue;
    }

    return `${formattedValue}${metric.unit ?? ""}`;
}

function formatMetricChange(metric) {
    if (metric?.change === null || metric?.change === undefined || !Number.isFinite(Number(metric.change))) {
        return null;
    }

    const change = Number(metric.change);
    const sign = change > 0 ? "+" : "";
    const suffix = metric.changeType === "percentage_points"
        ? " pp"
        : metric.changeType === "growth_percent"
            ? "%"
            : metric.unit ?? "";

    return `${metric.direction === "up" ? "↑" : metric.direction === "down" ? "↓" : "→"} ${sign}${change.toFixed(2)}${suffix}`;
}

function KeyMetricCard({ metric }) {
    const config = keyMetricConfig[metric?.metric] ?? {
        icon: "•",
        format: "number",
        description: metric?.description ?? "Financial metric"
    };
    const isCalculated = metric?.status === "calculated" && formatMetricValue(metric, config) !== "N/A";
    const trend = metric?.trend;

    return (
        <article className={`key-metric-card ${isCalculated ? "" : "is-unavailable"}`}>
            <div className="key-metric-card-head">
                <div className="key-metric-title">
                    <span className="key-metric-icon" aria-hidden="true">{config.icon}</span>
                    <h3>{metric?.label || "Key metric"}</h3>
                </div>
                {trend && <span className={`metric-trend metric-trend-${trend}`}>{trend}</span>}
            </div>
            <strong className={`key-metric-value ${isCalculated ? "" : "is-unavailable"}`}>
                {formatMetricValue(metric, config)}
            </strong>
            {formatMetricChange(metric) && (
                <span className="key-metric-change">{formatMetricChange(metric)}</span>
            )}
            {metric?.currentPeriod && metric?.previousPeriod && (
                <span className="key-metric-period">{metric.currentPeriod} vs {metric.previousPeriod}</span>
            )}
            <p className="key-metric-description">{metric?.description ?? config.description}</p>
            {!isCalculated && <span className="key-metric-reason">{metric?.reason || "Required data is unavailable"}</span>}
        </article>
    );
}

export default KeyMetricCard;
