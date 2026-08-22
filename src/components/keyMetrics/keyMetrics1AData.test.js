import test from "node:test";
import assert from "node:assert/strict";

import { deriveAvailableYears, formatHistoricalValue, getComparisonState, getHistoricalRows, selectHistoricalData } from "./keyMetrics1AData.js";
import { displayLabel } from "../../utils/analyticsData.js";

test("historical data stays empty until backend data is available", () => {
    assert.deepEqual(getHistoricalRows(null), []);
    assert.equal(formatHistoricalValue(null), "—");
});

test("historical rows and years remain dynamic", () => {
    const periods = ["period-a", "period-b"];
    const data = {
        availableYears: periods,
        metrics: {
            netProfitMargin: { "period-a": 4.2, "period-b": null },
        },
    };

    assert.deepEqual(getHistoricalRows(data), [{
        metricName: "netProfitMargin",
        values: { "period-a": 4.2, "period-b": null },
    }]);
    assert.equal(formatHistoricalValue(data.metrics.netProfitMargin[periods[0]]), "4.2");
    assert.equal(formatHistoricalValue(data.metrics.netProfitMargin[periods[1]]), "—");
    assert.equal(formatHistoricalValue("", "%"), "—");
});

test("selects existing key metrics into dynamic historical periods", () => {
    const periods = ["period-previous", "period-current"];
    const currentValue = 14.2;
    const previousValue = 10.25;
    const historicalData = selectHistoricalData({
        years: periods,
        keyMetrics: {
            revenueGrowth: {
                label: "Revenue Growth",
                currentPeriod: periods[1],
                previousPeriod: periods[0],
                currentValue: currentValue,
                value: currentValue,
                status: "calculated"
            },
            netProfitMargin: {
                label: "Net Profit Margin",
                unit: "%",
                currentPeriod: periods[1],
                previousPeriod: periods[0],
                currentValue,
                previousValue,
                status: "calculated"
            },
            roe: {
                label: "ROE",
                unit: "%",
                currentPeriod: periods[1],
                previousPeriod: periods[0],
                currentValue: null,
                previousValue: null,
                status: "unavailable"
            }
        }
    });

    assert.deepEqual(historicalData.availableYears, periods);
    assert.equal(historicalData.metrics.revenueGrowth.values[periods[0]], null);
    assert.equal(historicalData.metrics.revenueGrowth.values[periods[1]], currentValue);
    assert.equal(historicalData.metrics.netProfitMargin.values[periods[0]], previousValue);
    assert.equal(historicalData.metrics.netProfitMargin.values[periods[1]], currentValue);
    assert.equal(historicalData.metrics.roe.values[periods[0]], null);
    assert.equal(formatHistoricalValue(null), "—");
});

test("comparison states use configured higher and lower directions", () => {
    const years = ["prior", "current"];
    const state = (metricName, previous, current) => getComparisonState({ metricName, values: { prior: previous, current } }, years);

    assert.equal(state("netProfitMargin", 3, 4).state, "favorable");
    assert.equal(state("netProfitMargin", 4, 3).state, "unfavorable");
    assert.equal(state("debtToEquity", 4, 3).state, "favorable");
    assert.equal(state("debtToEquity", 3, 4).state, "unfavorable");
    assert.equal(state("roe", 4, 4).state, "neutral");
});

test("missing comparisons are unavailable and Current Ratio stays contextual", () => {
    const years = ["prior", "current"];

    assert.deepEqual(getComparisonState({ metricName: "netProfitMargin", values: { current: 4 } }, years), {
        state: "unavailable",
        arrow: "—",
        label: "No comparison",
        currentPeriod: "current",
    });
    assert.equal(getComparisonState({ metricName: "currentRatio", values: { prior: 1, current: 9 } }, years).state, "neutral");
});

test("comparison uses supplied periods across multiple dynamic years", () => {
    const years = ["period-one", "period-two", "period-three", "period-four"];
    const comparison = getComparisonState({
        metricName: "ebitdaMargin",
        values: { "period-one": 2, "period-two": 3, "period-three": 4, "period-four": 5 },
    }, years);

    assert.equal(comparison.currentPeriod, "period-four");
    assert.equal(comparison.state, "favorable");
});

test("period ordering is chronological for any number of supplied years", () => {
    assert.deepEqual(deriveAvailableYears(["2025", "2024"]), ["2024", "2025"]);
    assert.deepEqual(deriveAvailableYears(["2025", "2021", "2023", "2022"]), ["2021", "2022", "2023", "2025"]);
    assert.deepEqual(deriveAvailableYears(["FY-A", "FY-B"]), ["FY-A", "FY-B"]);
});

test("single and missing periods remain unavailable without fabricated values", () => {
    const data = selectHistoricalData({
        years: ["2025"],
        keyMetrics: {
            debtToEquity: {
                label: "Debt-to-Equity Ratio",
                currentPeriod: "2025",
                previousPeriod: null,
                currentValue: 1.2,
                status: "calculated"
            }
        }
    });

    assert.deepEqual(data.availableYears, ["2025"]);
    assert.equal(data.metrics.debtToEquity.values["2024"], undefined);
    assert.equal(getComparisonState(data.metrics.debtToEquity, data.availableYears).label, "No comparison");
});

test("historical values and calculation metadata pass through from analytics", () => {
    const calculation = { formula: "supplied formula", currentPeriod: "2025", previousPeriod: "2024" };
    const data = selectHistoricalData({
        years: ["2025", "2024", "2023"],
        keyMetrics: {
            netProfitMargin: {
                label: "Net Profit Margin",
                values: { "2023": 3, "2024": 4, "2025": 5 },
                calculation,
                currentPeriod: "2025",
                previousPeriod: "2024"
            }
        }
    });

    assert.deepEqual(data.metrics.netProfitMargin.values, { "2023": 3, "2024": 4, "2025": 5 });
    assert.equal(getHistoricalRows(data)[0].calculation, calculation);
});

test("display labels omit statement row markers", () => {
    assert.equal(displayLabel("(a) Cash and cash equivalents"), "Cash and cash equivalents");
    assert.equal(displayLabel("(i) Other assets"), "Other assets");
    assert.equal(displayLabel("b) Inventories"), "Inventories");
    assert.equal(displayLabel("(a) (b) Receivables"), "Receivables");
    assert.equal(displayLabel("( c ) Other current assets"), "Other current assets");
    assert.equal(displayLabel("( e ) Finance costs"), "Finance costs");
});