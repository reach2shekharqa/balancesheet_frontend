export function getValidYears(analyticsData) {
    return [...new Set(
        (analyticsData?.years ?? [])
            .filter(year => year !== null && year !== undefined && String(year).trim() !== "")
            .map(year => String(year))
    )].sort((firstYear, secondYear) => {
        const firstStart = Number(String(firstYear).match(/20\d{2}/)?.[0] ?? 0);
        const secondStart = Number(String(secondYear).match(/20\d{2}/)?.[0] ?? 0);
        return secondStart - firstStart;
    });
}

export function numericValue(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function displayLabel(label) {
    return String(label ?? "")
        .replace(/^\*+|\*+$/g, "")
        .trim();
}