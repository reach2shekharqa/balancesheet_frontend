import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractIdentityFromPdfText } from "./identityTextParser";

const DEFAULT_MAX_PAGES = 5;

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractPdfText(file, maxPages = DEFAULT_MAX_PAGES) {
    try {
        const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const pagesScanned = Math.min(document.numPages, Math.max(1, Number(maxPages) || DEFAULT_MAX_PAGES));
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pagesScanned; pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map(item => item.str || "").join(" "));
        }

        return { text: pages.join("\n").trim(), pageCount: document.numPages, pagesScanned };
    } catch (cause) {
        const error = new Error("We couldn't read this PDF. Please use a valid text-based PDF.");
        error.code = "PDF_PREFLIGHT_FAILED";
        error.debugMessage = cause?.message || "Unknown PDF.js error";
        throw error;
    }
}

export async function extractIdentityFromPdf(file, maxPages = DEFAULT_MAX_PAGES) {
    const extraction = await extractPdfText(file, maxPages);
    const identity = extractIdentityFromPdfText(extraction.text);
    return {
        ...identity,
        status: identity.cin ? "verified" : "incomplete",
        source: "pdfjs",
        pageCount: extraction.pageCount,
        pagesScanned: extraction.pagesScanned,
        extractedTextLength: extraction.text.length,
        extractedTextPreview: extraction.text.slice(0, 1200) || "[No selectable text extracted]",
    };
}

export { DEFAULT_MAX_PAGES };