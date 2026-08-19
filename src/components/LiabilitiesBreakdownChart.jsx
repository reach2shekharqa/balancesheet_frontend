import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

function LiabilitiesBreakdownChart({ analyticsData }) {
    if (!analyticsData?.dataset) {
        return <p>No liabilities data available to display.</p>;
    }

    const validYears = getValidYears(analyticsData);
    const latestYear = validYears[0];

    console.log("[Liabilities Breakdown] dataset:", analyticsData?.dataset);
    console.log("[Liabilities Breakdown] selected year:", latestYear);

    const chartData = analyticsData.dataset
        .filter(row => row?.role === "detail")
        .map(row => ({
            name: displayLabel(row.label),
            value: numericValue(row.values?.[latestYear]),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0);

    if (chartData.length === 0) {
        return <p>No positive liability values available for {latestYear}.</p>;
    }

    const option = {
        title: {
            text: `Liabilities Breakdown - ${latestYear ?? "Latest"}`,
            left: "center",
        },
        tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
        },
        legend: {
            orient: "vertical",
            left: "left",
            top: "middle",
        },
        series: [
            {
                name: `Liabilities ${latestYear ?? "Latest"}`,
                type: "pie",
                radius: ["35%", "70%"],
                center: ["55%", "55%"],
                data: chartData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                    },
                },
                label: {
                    show: true,
                    formatter: "{b}: {d}%",
                },
            },
        ],
    };

    return (
        <div className="assets-chart">
            <ReactECharts
                option={option}
                style={{ height: "600px", width: "100%" }}
                notMerge={true}
                lazyUpdate={false}
            />
        </div>
    );
}

export default LiabilitiesBreakdownChart;