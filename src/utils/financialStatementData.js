import { getValidYears, numericValue } from "./analyticsData.js";

function collectPeriods(analyticsData) {
    const periods = [
        ...(analyticsData?.years ?? []),
        analyticsData?.periods?.currentPeriod,
        analyticsData?.periods?.previousPeriod,
        ...Object.values(analyticsData?.metrics ?? {}).flatMap(metric => Object.keys(metric?.values ?? {})),
        ...(analyticsData?.dataset ?? []).flatMap(row => Object.keys(row?.values ?? {})),
    ];

    return [...new Set(periods.filter(period => period !== null && period !== undefined && String(period).trim() !== "").map(String))];
}

export function deriveFinancialPeriods(...analyticsData) {
    return getValidYears({ years: analyticsData.flatMap(collectPeriods) });
}

export function getFinancialMetric(analyticsData, metricName, period) {
    const metricValue = numericValue(analyticsData?.metrics?.[metricName]?.values?.[period]);
    if (metricValue !== null) {
        return metricValue;
    }

    const datasetRow = (analyticsData?.dataset ?? []).find(row => row?.metricNames?.includes(metricName));
    return numericValue(datasetRow?.values?.[period]);
}

export function formatFinancialValue(value) {
    return value === null ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
