import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

function AssetsBreakdownChart({ analyticsData }) {
    const validYears = getValidYears(analyticsData);
    const latestYear = validYears[0];

    console.log("[Assets Breakdown] dataset:", analyticsData?.dataset);
    console.log("[Assets Breakdown] selected year:", latestYear);

    if (!analyticsData?.dataset) {
        return (
            <div>
                <p>No asset data available to display.</p>
            </div>
        );
    }

    const chartData = analyticsData.dataset
        .filter(row => row?.role === "detail")
        .map(row => ({
            name: displayLabel(row.label),
            value: numericValue(row.values?.[latestYear]),
        }))
        .filter(item => Number.isFinite(item.value) && item.value > 0);

    if (chartData.length === 0) {
        return (
            <div>
                <p>No positive asset values available.</p>
            </div>
        );
    }

    const option = {
        title: {
            text: `Assets Breakdown - ${latestYear ?? "Latest"}`,
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
                name: `Assets ${latestYear ?? "Latest"}`,
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
                style={{
                    height: "600px",
                    width: "100%",
                }}
                notMerge={true}
                lazyUpdate={false}
            />
        </div>
    );
}

export default AssetsBreakdownChart;