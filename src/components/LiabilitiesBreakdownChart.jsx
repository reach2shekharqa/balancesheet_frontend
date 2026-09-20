import { memo } from "react";
import ReactECharts from "echarts-for-react";
import { displayLabel, getAnalyticsSections, getSectionRows, getValueForPeriod, isChartRow } from "../utils/analyticsData";

const RING_COLORS = [
    "#2b6f9f",
    "#d94d4d",
    "#ebc95d",
    "#d48a4d",
    "#7a9d7e",
    "#9f6a5d",
    "#6d7fbf",
    "#5a9ca7",
    "#c69362",
    "#aa7c9c",
];

function LiabilitiesBreakdownChart({ analyticsData, selectedYear = null, sectionId = null }) {
    if (!analyticsData?.dataset) {
        return <p>No liabilities data available to display.</p>;
    }

    const validYears = (analyticsData?.years ?? []).map(String);
    const latestYear = selectedYear ?? validYears[0];
    const selectedSectionId = sectionId ?? getAnalyticsSections(analyticsData)[0]?.id;

    const chartData = getSectionRows(analyticsData, selectedSectionId)
        .filter(isChartRow)
        .map(row => ({
            name: displayLabel(row.label),
            rawValue: getValueForPeriod(row, latestYear),
            section: displayLabel(row.section ?? row.sourceSection ?? "Other liabilities"),
            statementOrder: row.statementOrder ?? row.rowIndex ?? 0,
        }))
        .filter(item => item.name && Number.isFinite(item.rawValue))
        .map(item => ({
            ...item,
            value: Math.abs(item.rawValue),
        }))
        .sort((first, second) => first.statementOrder - second.statementOrder)
        .map((item, index) => ({
            ...item,
            shortName: item.name.length > 18 ? `${item.name.slice(0, 15)}...` : item.name,
            itemStyle: { color: RING_COLORS[index % RING_COLORS.length] },
        }));

    if (chartData.length === 0) {
        return <p>No positive liability values available for {latestYear}.</p>;
    }

    const option = {
        tooltip: {
            trigger: "item",
            formatter: params => `${params.data.name}<br/>${Number(params.data.rawValue).toLocaleString()} (${params.percent}%)`,
        },
        legend: {
            type: "scroll",
            orient: "vertical",
            left: 0,
            top: "middle",
            bottom: 24,
            width: "34%",
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 12,
            textStyle: {
                color: "#2d3a46",
                fontSize: 11,
            },
            data: chartData.map(item => item.name),
            formatter: value => value,
        },
        series: [
            {
                type: "pie",
                center: ["58%", "55%"],
                radius: ["26%", "72%"],
                startAngle: 90,
                clockwise: true,
                data: chartData,
                itemStyle: {
                    borderColor: "#f4f1ee",
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    position: "inside",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    formatter: params => params.data.value > 0 ? params.data.shortName : "",
                },
                labelLine: { show: false },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 12,
                        shadowColor: "rgba(0, 0, 0, 0.18)",
                    },
                },
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

export default memo(LiabilitiesBreakdownChart);