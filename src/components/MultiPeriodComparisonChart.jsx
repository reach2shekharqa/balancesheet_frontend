import ReactECharts from "echarts-for-react";

import { deriveFinancialPeriods, getFinancialMetric } from "../utils/financialStatementData";

function MultiPeriodComparisonChart({ title, subtitle, sources, seriesDefinitions }) {
    const periods = deriveFinancialPeriods(...sources).slice().reverse();
    const series = seriesDefinitions.map(({ source, metricName, label, color }) => ({
        name: label,
        type: "line",
        smooth: true,
        connectNulls: false,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color },
        lineStyle: { color, width: 3 },
        data: periods.map(period => getFinancialMetric(source, metricName, period)),
    })).filter(chartSeries => chartSeries.data.some(value => value !== null));

    if (periods.length === 0 || series.length === 0) {
        return <div className="chart-empty"><strong>{title} unavailable</strong><p>No comparable values are available in the analytics response.</p></div>;
    }

    const option = {
        title: {
            text: title,
            subtext: subtitle,
            left: 20,
            top: 18,
            textStyle: { fontSize: 17, fontWeight: 700, color: "#17212b" },
            subtextStyle: { color: "#71808e", fontSize: 12 },
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "line" },
            valueFormatter: value => value === null ? "—" : Number(value).toLocaleString(),
        },
        legend: { top: 22, right: 20, type: "scroll", data: series.map(chartSeries => chartSeries.name) },
        grid: { left: 72, right: 28, top: 84, bottom: 54, containLabel: true },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: periods,
            axisLabel: { color: "#71808e", hideOverlap: true },
            axisLine: { lineStyle: { color: "#d9e0e6" } },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: "#71808e", formatter: value => Number(value).toLocaleString() },
            splitLine: { lineStyle: { color: "#edf0f3" } },
        },
        series,
        media: [{
            query: { maxWidth: 560 },
            option: {
                title: { left: 12, top: 12, text: "Comparison", subtext: "Values by period", textStyle: { fontSize: 14 }, subtextStyle: { fontSize: 10 } },
                legend: { type: "plain", orient: "vertical", top: 44, left: 12, itemGap: 5, textStyle: { fontSize: 10 } },
                grid: { left: 52, right: 12, top: 118, bottom: 44, containLabel: true },
                xAxis: { axisLabel: { fontSize: 10 } },
            },
        }],
    };

    return <ReactECharts option={option} style={{ height: "390px", width: "100%" }} notMerge={true} lazyUpdate={false} />;
}

export default MultiPeriodComparisonChart;
