import { displayLabel } from "../../utils/analyticsData";

function formatValue(value, metric, unit = metric?.unit) {
    if (value === null || value === undefined || value === "") return "Unavailable";
    return `${metric?.currencySymbol ?? ""}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function MetricDetailsPanel({ metric, onClose }) {
    const calculation = metric?.calculation;

    if (!calculation) return null;

    return (
        <div className="key-metrics-details-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section className="key-metrics-details-panel" role="dialog" aria-modal="true" aria-labelledby="key-metrics-details-title">
                <div className="key-metrics-details-panel-head">
                    <div>
                        <span className="eyebrow">Calculation details</span>
                        <h3 id="key-metrics-details-title">{displayLabel(metric.label)}</h3>
                    </div>
                    <button type="button" className="key-metrics-details-close" onClick={onClose} aria-label="Close calculation details">×</button>
                </div>
                <dl className="key-metrics-details-list">
                    <div><dt>Formula</dt><dd>{calculation.formula ?? "Not supplied"}</dd></div>
                    <div><dt>Result</dt><dd>{calculation.currentPeriod ?? "Current period"}: {formatValue(calculation.results?.currentValue, metric)}</dd></div>
                    {calculation.previousPeriod && <div><dt>Previous result</dt><dd>{calculation.previousPeriod}: {formatValue(calculation.results?.previousValue, metric)}</dd></div>}
                </dl>
                {calculation.inputs?.length > 0 && (
                    <div className="key-metrics-details-sources">
                        <h4>Source values</h4>
                        <div className="key-metrics-details-source-head"><span>Line item</span><span>{calculation.currentPeriod ?? "Current period"}</span><span>{calculation.previousPeriod ?? "Previous period"}</span></div>
                        {calculation.inputs.map(input => (
                            <div className="key-metrics-details-source-row" key={input.key}>
                                <span>{displayLabel(input.label)}</span>
                                <span>{formatValue(input.currentValue, metric, "")}</span>
                                <span>{formatValue(input.previousValue, metric, "")}</span>
                            </div>
                        ))}
                    </div>
                )}
                {calculation.source?.statement && <p className="key-metrics-details-provenance"><strong>Source statement</strong>{calculation.source.statement}</p>}
            </section>
        </div>
    );
}

export default MetricDetailsPanel;