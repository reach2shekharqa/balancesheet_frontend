import test from "node:test";
import assert from "node:assert/strict";

import { isPieComponent } from "./analyticsData.js";

test("component rows include detail rows only", () => {
    const dataset = [
        { label: "Detail A", role: "detail" },
        { label: "Detail B", role: "detail" },
        { label: "Total Current Liabilities", role: "sectionTotal" },
        { label: "Total Liabilities", role: "statementTotal" },
        { label: "Total Borrowings", role: "aggregate" }
    ];

    assert.deepEqual(
        dataset.filter(isPieComponent).map(row => row.label),
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
        dataset.filter(isPieComponent).map(row => row.values[2024]),
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
        dataset.filter(isPieComponent).map(row => row.label),
        ["A", "B", "C", "D"]
    );
});

test("document 9 maps eight detail rows and preserves three totals", () => {
    const dataset = [
        { label: "(a) Long Term Borrowings", role: "detail", values: { 2024: 1000000 } },
        { label: "(b) HDFC Bank-Vehicle Loan", role: "detail", values: { 2024: 200000 } },
        { label: "(c) Long term Lease Liabilities", role: "detail", values: { 2024: 150000 } },
        { label: "(d) Long term Provisions", role: "detail", values: { 2024: 49661.8 } },
        { label: "(e) Deffered Tax Liabilities", role: "detail", values: { 2024: 0 } },
        { label: "Total Non-Current Liabilities", role: "sectionTotal", values: { 2024: 1409661.8 } },
        { label: "(a) Short tem Borrowings", role: "detail", values: { 2024: 1000000 } },
        { label: "(b) Trade Payables", role: "detail", values: { 2024: 1000000 } },
        { label: "(c) Other Current Liabilities", role: "detail", values: { 2024: 1059577.41 } },
        { label: "Total Current Liabilities", role: "sectionTotal", values: { 2024: 3059577.41 } },
        { label: "Total Liabilities", role: "statementTotal", values: { 2024: 5398815.85 } }
    ];

    assert.equal(dataset.filter(isPieComponent).length, 8);
    assert.deepEqual(
        dataset.filter(isPieComponent).map(row => row.label),
        [
            "(a) Long Term Borrowings",
            "(b) HDFC Bank-Vehicle Loan",
            "(c) Long term Lease Liabilities",
            "(d) Long term Provisions",
            "(e) Deffered Tax Liabilities",
            "(a) Short tem Borrowings",
            "(b) Trade Payables",
            "(c) Other Current Liabilities"
        ]
    );
    assert.deepEqual(
        dataset.filter(row => row.role === "sectionTotal" || row.role === "statementTotal").map(row => row.values[2024]),
        [1409661.8, 3059577.41, 5398815.85]
    );
});