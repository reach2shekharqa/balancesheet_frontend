function normalizeIdentifier(value) {
    return String(value ?? "").replace(/[\s-]+/g, "").toUpperCase();
}

function normalizeCompanyName(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function firstMatch(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) return match[1].trim();
    }
    return null;
}

const CIN_VALUE_PATTERN = "([A-Z][0-9]{5}[\\s-]*[A-Z]{2}[\\s-]*[0-9]{4}[\\s-]*[A-Z]{3}[\\s-]*[0-9]{6})";

export function extractIdentityFromPdfText(text) {
    const source = String(text ?? "");
    const cin = firstMatch(source, [
        new RegExp(`\\b(?:CIN|corporate\\s+(?:identity|identification)|company\\s+identification)\\s+number\\s*[:#-]?\\s*${CIN_VALUE_PATTERN}\\b`, "i"),
        new RegExp(`\\bCIN\\s*[:#-]?\\s*${CIN_VALUE_PATTERN}\\b`, "i"),
    ]);
    const pan = firstMatch(source, [
        /\b(?:PAN|permanent\s+account\s+number)\s*[:#-]?\s*([A-Z]{5}[0-9]{4}[A-Z])\b/i,
    ]);
    const companyName = firstMatch(source, [
        /(?:company|legal)\s+name\s*[:|-]\s*([^\n|]+)/i,
        /(?:^|\n)\s*name\s+of\s+the\s+company\s*[:|-]\s*([^\n|]+)/i,
    ]);

    return {
        companyName: companyName ? normalizeCompanyName(companyName) : null,
        cin: cin ? normalizeIdentifier(cin) : null,
        pan: pan ? normalizeIdentifier(pan) : null,
    };
}