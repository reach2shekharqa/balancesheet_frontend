import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, numericValue } from "../utils/analyticsData";

function AssetsBreakdownChart({ analyticsData, selectedYear = null }) {
    const validYears = getValidYears(analyticsData);
    const latestYear = selectedYear ?? validYears[0];

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

        series: [
            {
                name: `Assets ${latestYear ?? "Latest"}`,
                type: "pie",
                radius: ["35%", "68%"],
                center: ["70%", "55%"],

                data: chartData,

                itemStyle: { borderColor: "#ffffff", borderWidth: 2 },

                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                    },
                },

                label: {
                    show: false,
                },
            },
        ],
        media: [{
            query: { maxWidth: 700 },
            option: {
                title: { left: 12, top: 12, text: "Assets breakdown", textStyle: { fontSize: 14 } },
                legend: { left: 12, right: 12, top: "60%", width: undefined, height: 150, orient: "vertical", type: "scroll", itemGap: 6, textStyle: { fontSize: 10, width: 250 } },
                series: [{ center: ["50%", "34%"], radius: ["23%", "43%"] }],
            },
        }],
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