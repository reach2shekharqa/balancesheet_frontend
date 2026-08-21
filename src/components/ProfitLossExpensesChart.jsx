import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

const EXPENSE_LABEL = /expense|cost|depreciation|amortization|impairment|employee|payroll|administrative|selling|distribution|finance|interest|tax|purchase|stock|inventory|inventories|materials|material/i;
const TOTAL_LABEL = /total|gross profit|operating profit|profit before|profit after|net income|net profit|ebit|revenue|sales|income/i;

function ProfitLossExpensesChart({ analyticsData }) {
    const years = getValidYears(analyticsData);
    const selectedYear = years[0] ?? null;

    if (!analyticsData?.dataset || !selectedYear) {
        return <div className="chart-empty"><strong>Expense data unavailable</strong><p>The selected report does not include a profit and loss period.</p></div>;
    }

    const expenseRows = analyticsData.dataset
        .filter(row => row?.role === "expense" || String(row?.section ?? "").toLowerCase().includes("expense") || row?.role === "detail")
        .map(row => ({
            name: displayLabel(row.label),
            value: numericValue(row.values?.[selectedYear]),
        }))
        .filter(item => Number.isFinite(item.value));

    const chartData = expenseRows
        .filter(item => EXPENSE_LABEL.test(item.name) && !TOTAL_LABEL.test(item.name))
        .map(item => ({ ...item, value: Math.abs(item.value) }))
        .filter(item => item.value > 0);

    if (chartData.length === 0) {
        return <div className="chart-empty"><strong>No expense lines found</strong><p>The report contains a profit and loss statement, but no itemized expense values were detected.</p></div>;
    }

    const option = {
        title: {
            text: `Expenses: ${selectedYear} Breakdown`,
            subtext: "Profit & loss expense composition",
            left: 20,
            top: 18,
            textStyle: { fontSize: 17, fontWeight: 700, color: "#17212b" },
            subtextStyle: { color: "#71808e", fontSize: 12 },
        },
        tooltip: {
            trigger: "item",
            valueFormatter: value => Number(value).toLocaleString(),
        },
        legend: {
            orient: "vertical",
            left: 20,
            top: "middle",
            type: "scroll",
            height: 260,
        },
        series: [{
            name: `${selectedYear} expenses`,
            type: "pie",
            radius: ["35%", "68%"],
            center: ["58%", "56%"],
            data: chartData,
            itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
            label: { formatter: "{b}: {d}%" },
            emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(23, 33, 43, .18)" } },
        }],
    };

    return (
        <div className="assets-chart">
            <ReactECharts option={option} style={{ height: "520px", width: "100%" }} notMerge={true} lazyUpdate={false} />
        </div>
    );
}

export default ProfitLossExpensesChart;
