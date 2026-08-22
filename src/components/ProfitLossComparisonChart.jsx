import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

function ProfitLossComparisonChart({ analyticsData }) {
    const years = getValidYears(analyticsData);
    const latestYear = years[0];
    const previousYear = years[1];

    if (!analyticsData?.dataset || !latestYear || !previousYear) {
        return <div className="chart-empty"><strong>Expense comparison unavailable</strong><p>The selected report does not include two comparable periods.</p></div>;
    }

    const comparisonData = analyticsData.dataset
        .filter(row => row?.role !== "sectionTotal" && (row?.role === "expense" || String(row?.section ?? "").toLowerCase().includes("expense")))
        .map(row => ({
            name: displayLabel(row.label),
            latestValue: numericValue(row.values?.[latestYear]),
            previousValue: numericValue(row.values?.[previousYear]),
        }))
        .filter(item => item.latestValue !== null || item.previousValue !== null);

    if (comparisonData.length === 0) {
        return <div className="chart-empty"><strong>No expense values found</strong><p>The report does not contain itemized expenses for the selected periods.</p></div>;
    }

    const option = {
        title: {
            text: "Expense comparison",
            subtext: `${latestYear} vs ${previousYear}`,
            left: 20,
            top: 18,
            textStyle: { fontSize: 17, fontWeight: 700, color: "#17212b" },
            subtextStyle: { color: "#71808e", fontSize: 12 },
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            valueFormatter: value => Number(value).toLocaleString(),
        },
        legend: { top: 22, right: 20, data: [latestYear, previousYear] },
        grid: { left: 180, right: 24, top: 82, bottom: 26, containLabel: true },
        xAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "#edf0f3" } },
            axisLabel: { color: "#71808e", formatter: value => Number(value).toLocaleString() },
        },
        yAxis: {
            type: "category",
            data: comparisonData.map(item => item.name),
            axisLabel: { color: "#4e5d6b", width: 155, overflow: "truncate" },
        },
        series: [
            { name: latestYear, type: "bar", data: comparisonData.map(item => item.latestValue), barMaxWidth: 16, itemStyle: { color: "#1769d4" } },
            { name: previousYear, type: "bar", data: comparisonData.map(item => item.previousValue), barMaxWidth: 16, itemStyle: { color: "#8ca8c5" } },
        ],
        media: [{
            query: { maxWidth: 500 },
            option: {
                title: { left: 12, top: 12, textStyle: { fontSize: 14 } },
                legend: { top: 46, left: 12, right: 12, itemGap: 8, textStyle: { fontSize: 10 } },
                grid: { left: 82, right: 12, top: 82, bottom: 30, containLabel: true },
                yAxis: { axisLabel: { width: 68, fontSize: 9 } },
            },
        }],
    };

    return (
        <div className="assets-chart">
            <ReactECharts option={option} style={{ height: `${Math.max(420, comparisonData.length * 48 + 110)}px`, width: "100%" }} notMerge={true} lazyUpdate={false} />
        </div>
    );
}

export default ProfitLossComparisonChart;
