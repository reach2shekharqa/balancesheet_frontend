import test from "node:test";
import assert from "node:assert/strict";

import { isComponentRow } from "./analyticsData.js";

test("component rows include detail rows only", () => {
    const dataset = [
        { label: "Detail A", role: "detail" },
        { label: "Detail B", role: "detail" },
        { label: "Total Current Liabilities", role: "sectionTotal" },
        { label: "Total Liabilities", role: "statementTotal" },
        { label: "Total Borrowings", role: "aggregate" }
    ];

    assert.deepEqual(
        dataset.filter(isComponentRow).map(row => row.label),
        ["Detail A", "Detail B"]
    );
});

test("structural subtotals cannot become components from numeric values", () => {
    const dataset = [
        { label: "Detail A", role: "detail", values: { 2024: 100 } },
        { label: "Detail B", role: "detail", values: { 2024: 200 } },
        {
            label: "",
            role: "sectionTotal",
            values: { 2024: 300 },
            resolution: { method: "structuralSubtotal" }
        }
    ];

    assert.deepEqual(
        dataset.filter(isComponentRow).map(row => row.values[2024]),
        [100, 200]
    );
});

test("component filtering remains role-based across multiple sections", () => {
    const dataset = [
        { label: "A", role: "detail" },
        { label: "B", role: "detail" },
        { label: "Non-current subtotal", role: "sectionTotal" },
        { label: "C", role: "detail" },
        { label: "D", role: "detail" },
        { label: "Current subtotal", role: "sectionTotal" },
        { label: "Total liabilities", role: "statementTotal" }
    ];

    assert.deepEqual(
        dataset.filter(isComponentRow).map(row => row.label),
        ["A", "B", "C", "D"]
    );
});