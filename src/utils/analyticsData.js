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

export function isPieComponent(item) {
    return item?.role === "detail";
}

function isExpenseSection(label) {
    const words = String(label ?? "")
        .toLowerCase()
        .replace(/[^a-z]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return words.some(word => {
        if (word === "expense" || word === "expenses") {
            return true;
        }

        if (Math.abs(word.length - 8) > 1) {
            return false;
        }

        let edits = Math.abs(word.length - 8);
        for (let index = 0; index < Math.min(word.length, 8); index++) {
            if (word[index] !== "expenses"[index]) {
                edits++;
            }
        }

        return edits <= 1;
    });
}

export function isExpensePieComponent(item) {
    return isPieComponent(item) && isExpenseSection(item?.sourceSection ?? item?.section);
}

export const isComponentRow = isPieComponent;

export function displayLabel(label) {
    return String(label ?? "")
        .replace(/^\*+|\*+$/g, "")
    .replace(/^(?:\s*(?:\(\s*[a-z0-9]+\s*\)|[a-z0-9]+\s*[.)]))+\s*/i, "")
        .trim();
}