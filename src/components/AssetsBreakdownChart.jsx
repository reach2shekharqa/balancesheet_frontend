import { memo } from "react";
import ReactECharts from "echarts-for-react";
import { displayLabel, getValidYears, isComponentRow, numericValue } from "../utils/analyticsData";

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

function AssetsBreakdownChart({ analyticsData, selectedYear = null, assetScope = "non-current" }) {
    const validYears = getValidYears(analyticsData);
    const latestYear = selectedYear ?? validYears[0];

    function matchesAssetSection(value) {
        const normalizedSection = displayLabel(value)
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        if (assetScope === "current") {
            return /\bcurrent\s+assets?\b/.test(normalizedSection) && !/\bnon[- ]?current\s+assets?\b/.test(normalizedSection);
        }

        return /\bnon[- ]?current\s+assets?\b/.test(normalizedSection);
    }

    function getRowValue(row) {
        const values = row.values ?? {};
        const matchingYear = Object.keys(values).find(year => String(year) === String(latestYear))
            ?? Object.keys(values).find(year => String(year).includes(String(latestYear ?? "")));
        return numericValue(values[matchingYear]);
    }

    if (!analyticsData?.dataset) {
        return (
            <div>
                <p>No asset data available to display.</p>
            </div>
        );
    }

    const chartData = analyticsData.dataset
        .filter(row => isComponentRow(row) || row?.role === "tax")
        .filter(row => {
            const sectionNames = [row.section, row.sourceSection, row.sourceRowSection]
                .filter(Boolean)
            return sectionNames.some(matchesAssetSection);
        })
        .map(row => ({
            name: displayLabel(row.label),
            rawValue: getRowValue(row),
            section: displayLabel(row.section ?? row.sourceSection ?? "Other assets"),
        }))
        .filter(item => item.name && Number.isFinite(item.rawValue))
        .map(item => ({
            ...item,
            value: Math.abs(item.rawValue),
        }))
        .map((item, index) => ({
            ...item,
            shortName: item.name.length > 18 ? `${item.name.slice(0, 15)}...` : item.name,
            itemStyle: { color: RING_COLORS[index % RING_COLORS.length] },
        }));

    if (chartData.length === 0) {
        return (
            <div>
                <p>No positive asset values available.</p>
            </div>
        );
    }

    const option = {
        tooltip: {
            trigger: "item",
            formatter: params => `${params.data.name}<br/>${Number(params.data.rawValue).toLocaleString()} (${params.percent}%)`,
        },
        legend: {
            orient: "vertical",
            left: 0,
            top: "middle",
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
                    formatter: params => params.data.shortName,
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
                style={{
                    height: "520px",
                    width: "100%",
                }}
                notMerge={true}
                lazyUpdate={false}
            />
        </div>
    );
}

export default memo(AssetsBreakdownChart);