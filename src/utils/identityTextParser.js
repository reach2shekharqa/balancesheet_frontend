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

export function extractIdentityFromPdfText(text) {
    const source = String(text ?? "");
    const cin = firstMatch(source, [
        /\b(?:CIN|corporate\s+(?:identity|identification)|company\s+identification)\s+number\s*[:#-]?\s*([A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b/i,
        /\bCIN\s*[:#-]?\s*([A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b/i,
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