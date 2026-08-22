export const analyticsTabs = [
    {
        id: "balanceSheet1A",
        label: "Balance Sheet",
        subtitle: "Period view",
        value: "balanceSheet1A",
        visible: true,
        heading: {
            eyebrow: "Period view",
            title: "Balance Sheet",
            description: "Review the existing balance sheet values for one financial period.",
        },
    },
    {
        id: "profitLoss1A",
        label: "Profit & Loss",
        subtitle: "Period view",
        value: "profitLoss1A",
        visible: true,
        heading: {
            eyebrow: "Period view",
            title: "Profit & Loss",
            description: "Review the existing profit and loss values for one financial period.",
        },
    },
    {
        id: "keyMetrics1A",
        label: "Key Metrics",
        subtitle: "Historical intelligence",
        value: "keyMetrics1A",
        visible: true,
        defaultFocus: true,
        heading: {
            eyebrow: "Historical intelligence",
            title: "Key Metrics",
            description: "Review the existing key metrics across available financial periods.",
        },
    },
    {
        id: "keyMetrics",
        label: "Key Metrics",
        subtitle: "Growth signals",
        value: "keyMetrics",
        visible: false,
    },
    {
        id: "balanceSheet",
        label: "Balance sheet",
        subtitle: "Assets & liabilities",
        value: "comparison",
        activeValues: ["comparison", "breakdown", "liabilities"],
        visible: false,
    },
    {
        id: "profitLoss",
        label: "Profit & loss",
        subtitle: "Revenue & expenses",
        value: "profitLoss",
        activeValues: ["profitLoss", "profitComparison"],
        visible: false,
    },
];

export const visibleAnalyticsTabs = analyticsTabs.filter(tab => tab.visible);
export const defaultAnalyticsTab = visibleAnalyticsTabs.find(tab => tab.defaultFocus)?.value
    ?? visibleAnalyticsTabs[0]?.value
    ?? null;

export function isAnalyticsTabActive(tab, activeValue) {
    return (tab.activeValues ?? [tab.value]).includes(activeValue);
}

export function getAnalyticsTab(value) {
    return analyticsTabs.find(tab => tab.value === value) ?? null;
}
