import { memo } from "react";
import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, isPieComponent, numericValue } from "../utils/analyticsData";

function LiabilitiesBreakdownChart({ analyticsData, selectedYear = null }) {
    if (!analyticsData?.dataset) {
        return <p>No liabilities data available to display.</p>;
    }

    const validYears = getValidYears(analyticsData);
    const latestYear = selectedYear ?? validYears[0];

    const dataset = analyticsData.dataset;

    console.log("[LIABILITIES PIE] dataset", dataset);
    console.log("[Liabilities Breakdown] selected year:", latestYear);

    const pieRows = dataset.filter(isPieComponent);
    const labelCounts = pieRows.reduce((counts, row) => {
        const label = displayLabel(row.label);
        counts.set(label, (counts.get(label) ?? 0) + 1);
        return counts;
    }, new Map());

    console.log("[LIABILITIES PIE] component rows", pieRows);
    console.log(
        "[LIABILITIES PIE] excluded totals",
        dataset.filter(row => row?.role === "sectionTotal" || row?.role === "statementTotal")
    );

    const chartData = pieRows
        .map(row => {
            const baseName = displayLabel(row.label);
            const sectionName = displayLabel(row.section ?? row.sourceSection);

            return {
                name: labelCounts.get(baseName) > 1 && sectionName
                    ? `${baseName} (${sectionName})`
                    : baseName,
                value: numericValue(row.values?.[latestYear]),
            };
        })
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
            formatter: value => {
                const item = chartData.find(chartItem => chartItem.name === value);
                return item ? `${displayLabel(value)}: ${Number(item.value).toLocaleString()}` : displayLabel(value);
            },
            textStyle: { color: "#4e5d6b", fontSize: 12, width: 250, overflow: "truncate", ellipsis: "..." },
        },
        series: [
            {
                name: `Liabilities ${latestYear ?? "Latest"}`,
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
                title: { left: 12, top: 12, text: "Liabilities breakdown", textStyle: { fontSize: 14 } },
                legend: { left: 12, right: 12, top: "60%", width: undefined, height: 150, orient: "vertical", type: "scroll", itemGap: 6, textStyle: { fontSize: 10, width: 250 } },
                series: [{ center: ["50%", "34%"], radius: ["23%", "43%"] }],
            },
        }],
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

export default memo(LiabilitiesBreakdownChart);