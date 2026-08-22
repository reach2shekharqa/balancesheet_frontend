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

function formatInputValue(value, metric) {
    return value === null || value === undefined
        ? "Unavailable"
        : `${metric?.currencySymbol ?? ""}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatEquationValue(value, metric) {
    return value === null || value === undefined
        ? "Unavailable"
        : formatInputValue(value, metric);
}

function getInput(calculation, key) {
    return calculation?.inputs?.find(input => input.key === key);
}

function formatDerivedLabel(name, calculation) {
    if (name.startsWith("current")) {
        return `${calculation?.currentPeriod ?? "Current period"} ${name.slice("current".length)}`;
    }

    if (name.startsWith("previous")) {
        return `${calculation?.previousPeriod ?? "Previous period"} ${name.slice("previous".length)}`;
    }

    return name.replace(/([A-Z])/g, " $1").replace(/^./, character => character.toUpperCase());
}

function formatCalculation(metric, calculation) {
    const current = key => getInput(calculation, key)?.currentValue ?? null;
    const previous = key => getInput(calculation, key)?.previousValue ?? null;
    const result = value => value === null || value === undefined
        ? "N/A"
        : `${Number(value).toFixed(2)}${metric.unit ?? (calculation?.type === "revenueGrowth" ? "%" : "")}`;
    const value = amount => formatEquationValue(amount, metric);

    switch (calculation?.type) {
        case "revenueGrowth":
            return `Revenue Growth = (${value(current("revenueFromOperations"))} - ${value(previous("revenueFromOperations"))}) / ${value(previous("revenueFromOperations"))} x 100 = ${result(metric.currentValue)}`;
        case "netProfitMargin":
            return `Net Profit Margin = ${value(current("profitAfterTax"))} / ${value(current("revenueFromOperations"))} x 100 = ${result(metric.currentValue)}`;
        case "ebitdaMargin":
            return `EBITDA Margin = (${value(current("profitBeforeTax"))} + ${value(current("financeCosts"))} + ${value(current("depreciationAndAmortisation"))}) / ${value(current("revenueFromOperations"))} x 100 = ${result(metric.currentValue)}`;
        case "currentRatio":
            return `Current Ratio = ${value(current("totalCurrentAssets"))} / ${value(current("totalCurrentLiabilities"))} = ${result(metric.currentValue)}`;
        case "debtToEquity":
            return `Debt-to-Equity Ratio = ${value(calculation.derivedValues?.currentBorrowings)} / ${value(current("totalEquity"))} = ${result(metric.currentValue)}`;
        case "roe":
            return `ROE = ${value(current("profitAfterTax"))} / Average equity (${value(calculation.derivedValues?.averageDenominator)}) x 100 = ${result(metric.currentValue)}`;
        case "roa":
            return `ROA = ${value(current("profitAfterTax"))} / Average assets (${value(calculation.derivedValues?.averageDenominator)}) x 100 = ${result(metric.currentValue)}`;
        default:
            return null;
    }
}

function KeyMetricCard({ metric, isExpanded = false, onToggle }) {
    const config = keyMetricConfig[metric?.metric] ?? {
        icon: "•",
        format: "number",
        description: metric?.description ?? "Financial metric"
    };
    const isCalculated = metric?.status === "calculated" && formatMetricValue(metric, config) !== "N/A";
    const trend = metric?.trend;
    const calculation = metric?.calculation;
    const formula = calculation?.formula ?? config.formula;
    const meaning = config.meaning ?? config.description;

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
            <span className="key-metric-period">{metric?.currentPeriod ?? "Current period"} vs {metric?.previousPeriod ?? "Previous period"}</span>
            <p className="key-metric-description">{metric?.description ?? config.description}</p>
            {!isCalculated && <span className="key-metric-reason">{metric?.reason || "Required data is unavailable"}</span>}
            <details className="key-metric-details" open={isExpanded}>
                <summary onClick={event => { event.preventDefault(); onToggle?.(!isExpanded); }}>Calculation details &amp; source values</summary>
                <div className="key-metric-details-content">
                    <p><strong>What it tells you</strong><span>{meaning}</span></p>
                    <p><strong>Formula</strong><span>{formula}</span></p>
                    {formatCalculation(metric, calculation) && (
                        <p className="key-metric-equation"><strong>Calculation</strong><span>{formatCalculation(metric, calculation)}</span></p>
                    )}
                    {calculation?.results && (
                        <p><strong>Calculated values</strong><span>{calculation.currentPeriod ?? "Current period"}: {formatInputValue(calculation.results.currentValue, metric)}; {calculation.previousPeriod ?? "Previous period"}: {formatInputValue(calculation.results.previousValue, metric)}</span></p>
                    )}
                    {calculation?.inputs?.length > 0 && (
                        <p className="key-metric-equation">
                            <strong>Actual values used</strong>
                            <span>{calculation.inputs.map(input => `${input.label}: ${calculation.currentPeriod ?? "Current period"} = ${formatInputValue(input.currentValue, metric)}; ${calculation.previousPeriod ?? "Previous period"} = ${formatInputValue(input.previousValue, metric)}`).join(" | ")}</span>
                        </p>
                    )}
                    {Object.entries(calculation?.derivedValues ?? {}).filter(([, value]) => value !== null && value !== undefined).map(([name, value]) => (
                        <p key={name}><strong>{formatDerivedLabel(name, calculation)}</strong><span>{formatInputValue(value, metric)}</span></p>
                    ))}
                    {calculation?.inputs?.length > 0 && (
                        <div className="key-metric-inputs">
                            <strong>Validated analytics values</strong>
                            <span className="key-metric-source-note">These are the analytics values used for this metric.</span>
                            <div className="key-metric-input-head"><span>Line item</span><span>{calculation.currentPeriod ?? "Current"}</span><span>{calculation.previousPeriod ?? "Previous"}</span></div>
                            {calculation.inputs.map(input => (
                                <div className="key-metric-input-row" key={input.label}>
                                    <span title={input.label}>{input.label}</span>
                                    <strong className="key-metric-input-value">{formatInputValue(input.currentValue, metric)}</strong>
                                    <strong className="key-metric-input-value">{formatInputValue(input.previousValue, metric)}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </details>
        </article>
    );
}

export default KeyMetricCard;
