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
        title: {
            text: `Assets Comparison - ${latestYear ?? "Latest"} vs ${previousYear ?? "Previous"}`,
            left: "center",
        },
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        legend: {
            top: 32,
            data: [latestYear, previousYear].filter(Boolean),
        },
        grid: {
            left: 24,
            right: 24,
            bottom: 100,
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: comparisonData.map(item => item.name),
            axisLabel: {
                interval: 0,
                rotate: 30,
            },
        },
        yAxis: {
            type: "value",
        },
        series: [
            {
                name: latestYear,
                type: "bar",
                data: comparisonData.map(item => item.latestValue),
                itemStyle: { color: "#1f5fbf" },
            },
            {
                name: previousYear,
                type: "bar",
                data: comparisonData.map(item => item.previousValue),
                itemStyle: { color: "#f08a24" },
            },
        ],
    };

    return (
        <div className="assets-chart">
            <ReactECharts
                option={option}
                style={{ height: "520px", width: "100%" }}
                notMerge={true}
                lazyUpdate={false}
            />
        </div>
    );
}

export default AssetsComparisonChart;