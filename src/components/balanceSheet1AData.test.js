import test from "node:test";
import assert from "node:assert/strict";

import { deriveFinancialPeriods, getFinancialMetric, formatFinancialValue } from "../utils/financialStatementData.js";

function analytics(years, metrics = {}) {
    return { years, metrics };
}

test("Balance Sheet 1A exposes every available period and defaults to the latest", () => {
    const periods = deriveFinancialPeriods(analytics(["2024", "2025"]));

    assert.deepEqual(periods, ["2025", "2024"]);
    assert.equal(periods[0], "2025");
});

test("periods remain dynamic for six years and one year", () => {
    assert.deepEqual(
        deriveFinancialPeriods(analytics(["2020", "2021", "2022", "2023", "2024", "2025"])),
        ["2025", "2024", "2023", "2022", "2021", "2020"]
    );
    assert.deepEqual(deriveFinancialPeriods(analytics(["2025"])), ["2025"]);
});

test("selected period reads existing values without fabricating missing values", () => {
    const data = analytics(["2024", "2025"], {
        totalAssets: { values: { "2024": 120, "2025": 150 } },
        totalLiabilities: { values: { "2025": 90 } },
    });

    assert.equal(getFinancialMetric(data, "totalAssets", "2024"), 120);
    assert.equal(getFinancialMetric(data, "totalAssets", "2025"), 150);
    assert.equal(getFinancialMetric(data, "totalLiabilities", "2024"), null);
    assert.equal(formatFinancialValue(null), "—");
});

test("periods can be derived from existing metric and dataset keys", () => {
    assert.deepEqual(deriveFinancialPeriods(
        analytics([], { totalAssets: { values: { "FY-2023": 10 } } }),
        { dataset: [{ values: { "FY-2024": 11 } }] }
    ), ["FY-2024", "FY-2023"]);
});

test("metric values fall back to the existing dataset row when needed", () => {
    const data = {
        years: ["2025"],
        metrics: { totalAssets: { values: {} } },
        dataset: [{ metricNames: ["totalAssets"], values: { "2025": 7500 } }],
    };

    assert.equal(getFinancialMetric(data, "totalAssets", "2025"), 7500);
});

