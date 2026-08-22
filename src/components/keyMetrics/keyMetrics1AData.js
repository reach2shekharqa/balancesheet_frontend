import { displayLabel } from "../../utils/analyticsData.js";

const metricPresentation = Object.freeze({
    revenueGrowth: { direction: "higher" },
    netProfitMargin: { direction: "higher" },
    ebitdaMargin: { direction: "higher" },
    currentRatio: { direction: "contextual" },
    debtToEquity: { direction: "lower" },
    roe: { direction: "higher" },
    roa: { direction: "higher" },
});

function getNumericComparisonValue(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatHistoricalValue(value, unit = "") {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return `${value}${unit}`;
}

export function deriveAvailableYears(years) {
    const periods = [...new Set((years ?? [])
        .filter(year => year !== null && year !== undefined && String(year).trim() !== "")
        .map(String))];
    const numberedPeriods = periods.map((period, index) => ({
        period,
        index,
        start: Number(period.match(/\d{4}/)?.[0] ?? NaN)
    }));

    if (numberedPeriods.every(({ start }) => Number.isNaN(start))) {
        return periods;
    }

    return numberedPeriods.sort((first, second) => {
        if (Number.isNaN(first.start)) return 1;
        if (Number.isNaN(second.start)) return -1;
        return first.start - second.start || first.index - second.index;
    }).map(({ period }) => period);
}

export function selectHistoricalData(analyticsResponse) {
    const keyMetrics = analyticsResponse?.keyMetrics ?? {};
    const metricPeriods = Object.values(keyMetrics).flatMap(metric => [metric?.currentPeriod, metric?.previousPeriod]);
    const availableYears = deriveAvailableYears([...(analyticsResponse?.years ?? []), ...metricPeriods]);
    const metrics = Object.fromEntries(Object.entries(keyMetrics).map(([metricName, metric]) => {
        const values = { ...(metric?.values ?? {}) };

        if (metric?.currentPeriod) {
            const currentPeriod = String(metric.currentPeriod);
            if (!Object.prototype.hasOwnProperty.call(values, currentPeriod)) {
                values[currentPeriod] = metricName === "revenueGrowth"
                    ? (metric.status === "calculated" ? metric.value : null)
                    : metric.currentValue ?? null;
            }
        }

        if (metric?.previousPeriod) {
            const previousPeriod = String(metric.previousPeriod);
            if (!Object.prototype.hasOwnProperty.call(values, previousPeriod)) {
                values[previousPeriod] = metricName === "revenueGrowth"
                    ? null
                    : metric.previousValue ?? null;
            }
        }

        return [metricName, {
            ...metric,
                label: displayLabel(metric.label),
            unit: metric.unit ?? (metricName === "revenueGrowth" ? "%" : undefined),
            currentPeriod: metric.currentPeriod ?? null,
            previousPeriod: metric.previousPeriod ?? null,
            values,
        }];
    }));

    return { availableYears, metrics };
}

export function getHistoricalRows(historicalData) {
    return Object.entries(historicalData?.metrics ?? {}).map(([metricName, metric]) => ({
        metricName,
        ...(metric && Object.prototype.hasOwnProperty.call(metric, "values")
            ? {
                label: displayLabel(metric.label ?? metricName),
                unit: metric.unit,
                currentPeriod: metric.currentPeriod,
                previousPeriod: metric.previousPeriod,
                calculation: metric.calculation,
                values: metric.values ?? {},
            }
            : { values: metric ?? {} }),
    }));
}

export function getComparisonState(metric, years) {
    const values = metric?.values ?? {};
    const currentPeriod = metric?.currentPeriod ?? years.at(-1);
    const previousPeriod = metric?.previousPeriod ?? years.at(-2);
    const currentValue = getNumericComparisonValue(values[currentPeriod]);
    const previousValue = getNumericComparisonValue(values[previousPeriod]);
    const presentation = metricPresentation[metric?.metricName];

    if (currentValue === null || previousValue === null) {
        return { state: "unavailable", arrow: "—", label: "No comparison", currentPeriod };
    }

    if (!presentation || presentation.direction === "contextual") {
        return { state: "neutral", arrow: "→", label: "Contextual", currentPeriod };
    }

    const movement = currentValue > previousValue ? "up" : currentValue < previousValue ? "down" : "flat";
    const direction = presentation.direction;
    const improved = movement === "flat" ? null : direction === "lower" ? movement === "down" : movement === "up";

    return {
        state: improved === null ? "neutral" : improved ? "favorable" : "unfavorable",
        arrow: movement === "up" ? "↑" : movement === "down" ? "↓" : "→",
        label: improved === null ? "Neutral" : improved ? "Improved" : "Deteriorated",
        currentPeriod,
    };
}