import ReactECharts from "echarts-for-react";
import { displayLabel, getExpenseBreakdownRows, getValidYears, numericValue } from "../utils/analyticsData";

function ProfitLossExpensesChart({ analyticsData, selectedYear = null }) {
    console.log("[ExpenseChart VERSION] expense-resolver-debug-v2");
    const years = getValidYears(analyticsData);
    const displayedYear = selectedYear ?? years[0] ?? null;

    if (!analyticsData?.dataset || !displayedYear) {
        return <div className="chart-empty"><strong>Expense data unavailable</strong><p>The selected report does not include a profit and loss period.</p></div>;
    }

    const rowsBeforeFilter = analyticsData.dataset;
    console.log("EXPENSE BREAKDOWN ROWS BEFORE FILTER", rowsBeforeFilter.map(row => ({
        metric: row.metric,
        name: row.label,
        value: row.values,
        role: row.role,
        sourceSection: row.sourceSection,
        section: row.section,
        statement: row.statement,
        sourceTableStatement: row.sourceTableStatement
    })));
    const resolvedExpenseRows = getExpenseBreakdownRows(rowsBeforeFilter);
    const expenseRows = resolvedExpenseRows
        .map(row => ({
            name: displayLabel(row.label),
            value: numericValue(row.values?.[displayedYear]),
        }))
        .filter(item => Number.isFinite(item.value));

    console.log("EXPENSE BREAKDOWN DEBUG", {
        backendExpenseRows: analyticsData.metrics
            ? Object.values(analyticsData.metrics).filter(metric => metric.role === "detail" && /expense/i.test(String(metric.sourceSection ?? metric.section ?? ""))).length
            : "unknown",
        frontendRowsBeforeFilter: rowsBeforeFilter.length,
        expenseRowsAfterFilter: expenseRows.length,
        excludedRows: rowsBeforeFilter.filter(row => !getExpenseBreakdownRows([row]).length).map(row => row.label)
    });

    const chartData = expenseRows
        .map(item => ({ ...item, value: Math.abs(item.value) }))
        .filter(item => item.value > 0);

    const emptyStateCondition = chartData.length === 0;
    console.log("[ExpenseChart LIVE]", {
        analyticsDataExists: Boolean(analyticsData),
        analyticsDataKeys: Object.keys(analyticsData ?? {}),
        rawRowsCount: rowsBeforeFilter.length,
        resolvedExpenseRowsCount: resolvedExpenseRows.length,
        resolvedExpenseRows: resolvedExpenseRows.map(row => ({
            name: row.name ?? row.label,
            currentPeriod: row.currentPeriod,
            previousPeriod: row.previousPeriod,
            currentYear: row.currentYear,
            previousYear: row.previousYear,
            value: row.value,
            values: row.values,
            year: row.year,
        })),
        chartDataCount: chartData.length,
        emptyStateCondition,
    });

    if (emptyStateCondition) {
        return <div className="chart-empty"><strong>No expense lines found</strong><p>The report contains a profit and loss statement, but no itemized expense values were detected.</p></div>;
    }

    const option = {
        title: {
            text: `Expenses: ${displayedYear} Breakdown`,
            subtext: "Profit & loss expense composition",
            left: 20,
            top: 18,
            textStyle: { fontSize: 17, fontWeight: 700, color: "#17212b" },
            subtextStyle: { color: "#71808e", fontSize: 12 },
        },
        tooltip: {
            trigger: "item",
            formatter: params => `${params.name}<br/>${Number(params.value).toLocaleString()} (${params.percent}%)`,
        },
        legend: {
            orient: "vertical",
            left: 20,
            top: "middle",
            type: "scroll",
            height: 260,
            width: 290,
            itemGap: 10,
            formatter: value => displayLabel(value),
            textStyle: { color: "#4e5d6b", fontSize: 12, width: 250, overflow: "truncate", ellipsis: "..." },
        },
        series: [{
            name: `${displayedYear} expenses`,
            type: "pie",
            radius: ["35%", "68%"],
            center: ["70%", "56%"],
            data: chartData,
            itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
            label: { show: false },
            emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(23, 33, 43, .18)" } },
        }],
        media: [{
            query: { maxWidth: 700 },
            option: {
                title: { left: 12, top: 12, text: "Expense breakdown", subtext: "Expense composition", textStyle: { fontSize: 14 }, subtextStyle: { fontSize: 10 } },
                legend: { left: 12, right: 12, top: "60%", width: undefined, height: 150, orient: "vertical", type: "scroll", itemGap: 6, textStyle: { fontSize: 10, width: 250 } },
                series: [{ center: ["50%", "34%"], radius: ["23%", "43%"] }],
            },
        }],
    };

    return (
        <div className="assets-chart">
            <ReactECharts option={option} style={{ height: "520px", width: "100%" }} notMerge={true} lazyUpdate={false} />
        </div>
    );
}

export default ProfitLossExpensesChart;
