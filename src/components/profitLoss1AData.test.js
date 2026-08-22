import test from "node:test";
import assert from "node:assert/strict";

import { deriveFinancialPeriods, getFinancialMetric, formatFinancialValue } from "../utils/financialStatementData.js";

test("Profit and Loss 1A uses all analytics periods and latest by default", () => {
    const data = {
        years: ["2024", "2025"],
        metrics: {
            revenueFromOperations: { values: { "2024": 100, "2025": 125 } },
            profitAfterTax: { values: { "2024": 20, "2025": 30 } },
        },
    };

    const periods = deriveFinancialPeriods(data);
    assert.deepEqual(periods, ["2025", "2024"]);
    assert.equal(getFinancialMetric(data, "revenueFromOperations", periods[0]), 125);
    assert.equal(getFinancialMetric(data, "profitAfterTax", "2024"), 20);
});

test("Profit and Loss 1A keeps missing metrics unavailable", () => {
    const data = { years: ["2025"], metrics: { totalIncome: { values: {} } } };

    assert.deepEqual(deriveFinancialPeriods(data), ["2025"]);
    assert.equal(getFinancialMetric(data, "totalIncome", "2025"), null);
    assert.equal(formatFinancialValue(null), "—");
});
