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

function normalizeMetadata(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/0/g, "o")
        .replace(/1/g, "l")
        .replace(/[^a-z]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isExpenseSection(label) {
    const words = normalizeMetadata(label).split(" ").filter(Boolean);

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
    if (!isPieComponent(item)) {
        return false;
    }

    const rowLabel = normalizeMetadata(item?.label ?? item?.name);
    const metadata = [
        item?.sourceSection,
        item?.section,
        item?.statement,
        item?.sourceTableStatement
    ].map(normalizeMetadata);
    const sectionMetadata = metadata.slice(0, 2).filter(Boolean);
    const statementMetadata = metadata.slice(2).filter(Boolean);

    if (
        /\b(?:revenue|income|profit|loss|ebitda|ebit|pbt|pat)\b/.test(rowLabel) ||
        /\b(?:total|subtotal|aggregate)\b/.test(rowLabel) ||
        /\b(?:revenue|income|ebitda|ebit|pbt|pat)\b/.test(statementMetadata.join(" "))
    ) {
        return false;
    }

    return sectionMetadata.some(isExpenseSection) ||
        (sectionMetadata.length === 0 && statementMetadata.some(isExpenseSection));
}

export function getExpenseBreakdownRows(dataset) {
    return (dataset ?? []).filter(isExpensePieComponent);
}


export const isComponentRow = isPieComponent;

export function displayLabel(label) {
    return String(label ?? "")
        .replace(/^\*+|\*+$/g, "")
    .replace(/^(?:\s*(?:\(\s*[a-z0-9]+\s*\)|[a-z0-9]+\s*[.)]))+\s*/i, "")
        .trim();
}