import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

function AssetsComparisonChart({ analyticsData }) {
    const validYears = getValidYears(analyticsData);
    const latestYear = validYears[0];
    const previousYear = validYears[1];

    console.log("[Assets Comparison] dataset:", analyticsData?.dataset);
    console.log("[Assets Comparison] selected years:", { latestYear, previousYear });

    const comparisonData = (analyticsData?.dataset ?? [])
        .filter(row => row?.role === "detail")
        .map(row => ({
            name: displayLabel(row.label),
            latestValue: numericValue(row.values?.[latestYear]),
            previousValue: numericValue(row.values?.[previousYear]),
        }))
        .filter(item => item.latestValue !== null || item.previousValue !== null);

    if (comparisonData.length === 0) {
        return <p>No asset values available to compare.</p>;
    }

    const option = {
        title: { text: "Assets comparison", subtext: `${latestYear ?? "Latest"} vs ${previousYear ?? "Previous"}`, left: 20, top: 18, textStyle: { fontSize: 17, fontWeight: 700, color: "#17212b" }, subtextStyle: { color: "#71808e", fontSize: 12 } },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        legend: {
            top: 22,
            right: 20,
            data: [latestYear, previousYear].filter(Boolean),
        },
        grid: {
            left: 150,
            right: 24,
            top: 82,
            bottom: 26,
            containLabel: true,
        },
        xAxis: { type: "value", splitLine: { lineStyle: { color: "#edf0f3" } }, axisLabel: { color: "#71808e", formatter: value => Number(value).toLocaleString() } },
        yAxis: { type: "category", data: comparisonData.map(item => item.name), axisLabel: { color: "#4e5d6b", width: 130, overflow: "truncate" } },
        series: [
            {
                name: latestYear,
                type: "bar",
                data: comparisonData.map(item => item.latestValue),
                barMaxWidth: 16,
                itemStyle: { color: "#1769d4" },
            },
            {
                name: previousYear,
                type: "bar",
                data: comparisonData.map(item => item.previousValue),
                barMaxWidth: 16,
                itemStyle: { color: "#8ca8c5" },
            },
        ],
    };

    return (
        <div className="assets-chart">
            <ReactECharts
                option={option}
                style={{ height: `${Math.max(420, comparisonData.length * 48 + 110)}px`, width: "100%" }}
                notMerge={true}
                lazyUpdate={false}
            />
        </div>
    );
}

export default AssetsComparisonChart;