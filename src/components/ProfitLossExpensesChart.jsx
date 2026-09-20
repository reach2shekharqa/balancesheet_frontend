import { memo } from "react";
import ReactECharts from "echarts-for-react";
import { displayLabel, getAnalyticsSections, getSectionRows, getValueForPeriod, isChartRow } from "../utils/analyticsData";

function ProfitLossExpensesChart({ analyticsData, selectedYear = null, sectionId = null }) {
    const years = (analyticsData?.years ?? []).map(String);
    const displayedYear = selectedYear ?? years[0] ?? null;
    const selectedSectionId = sectionId ?? getAnalyticsSections(analyticsData)[0]?.id;

    if (!analyticsData?.dataset || !displayedYear) {
        return <div className="chart-empty"><strong>Profit and loss data unavailable</strong><p>The selected report does not include a reporting period.</p></div>;
    }

    const expenseRows = getSectionRows(analyticsData, selectedSectionId)
        .filter(isChartRow)
        .map(row => ({
            name: displayLabel(row.label),
            value: getValueForPeriod(row, displayedYear),
            statementOrder: row.statementOrder ?? row.rowIndex ?? 0,
        }))
        .filter(item => item.name && Number.isFinite(item.value))
        .sort((first, second) => first.statementOrder - second.statementOrder);

    const chartData = expenseRows
        .map(item => ({ ...item, value: Math.abs(item.value) }))
        .filter(item => item.value >= 0);

    const emptyStateCondition = chartData.length === 0;

    if (emptyStateCondition) {
        return <div className="chart-empty"><strong>No rows found</strong><p>The selected report section has no itemized values for this period.</p></div>;
    }

    const option = {
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
        series: [{
            name: `${displayedYear} statement`,
            type: "pie",
            radius: ["35%", "68%"],
            center: ["70%", "56%"],
            data: chartData,
            itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
            label: { show: false },
            emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(23, 33, 43, .18)" } },
        }],
        media: [{
            query: { maxWidth: 700 },
            option: {
                legend: { left: 12, right: 12, top: "60%", width: undefined, height: 150, orient: "vertical", type: "scroll", itemGap: 6, textStyle: { fontSize: 10, width: 250 } },
                series: [{ center: ["50%", "34%"], radius: ["23%", "43%"] }],
            },
        }],
    };

    return (
        <div className="assets-chart">
            <ReactECharts option={option} style={{ height: "520px", width: "100%" }} notMerge={true} lazyUpdate={false} />
        </div>
    );
}

export default memo(ProfitLossExpensesChart);
