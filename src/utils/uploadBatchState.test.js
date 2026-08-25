import test from "node:test";
import assert from "node:assert/strict";
import { canAnalyzeFiles, canUploadForCompany, classifyUploadFailure, getBatchResultState, getFileIdentity, getIdentityValidationState, mergeUniqueFiles, removeFileByIdentity } from "./uploadBatchState.js";

function pdf(name, lastModified = 1) {
    return { name, size: 10, lastModified };
}

test("company upload capability follows the active access role", () => {
    assert.equal(canUploadForCompany({ companyId: 7, accessRole: "OWNER" }), true);
    assert.equal(canUploadForCompany({ companyId: 8, accessRole: "CONSUMER" }), false);
    assert.equal(canUploadForCompany(null), true);
    assert.equal(canAnalyzeFiles([{ file: pdf("independent.pdf") }], false, { status: "idle" }, false), true);
});

test("duplicate selection keeps one copy of each file", () => {
    const selected = mergeUniqueFiles([], [pdf("A.pdf"), pdf("A.pdf"), pdf("B.pdf")]);
    assert.deepEqual(selected.map(file => file.name), ["A.pdf", "B.pdf"]);
});

test("removing a selected file leaves it out of the request queue", () => {
    const entries = [pdf("A.pdf"), pdf("B.pdf"), pdf("C.pdf")].map(file => ({ file }));
    const remaining = removeFileByIdentity(entries, getFileIdentity(pdf("B.pdf")));
    assert.deepEqual(remaining.map(({ file }) => file.name), ["A.pdf", "C.pdf"]);
});

test("empty queue has no files to analyze", () => {
    assert.equal(canAnalyzeFiles([], false), false);
    assert.equal(getIdentityValidationState([]).status, "idle");
});

test("matching cached identities enable a multi-PDF batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    const cached = files.map(({ file }) => ({ fileHash: `${file.name}-hash`, identity: { cin: "CIN001", pan: "PAN001" } }));
    files.forEach(({ file }, index) => { file.fileHash = cached[index].fileHash; });
    const state = getIdentityValidationState(files, cached);
    assert.equal(state.status, "verified");
    assert.equal(state.error, "");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("different CIN creates a conflict even when PAN matches", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files[0].file.fileHash = "a".repeat(64);
    files[1].file.fileHash = "b".repeat(64);
    const cinState = getIdentityValidationState(files, [
        { fileHash: "a".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "b".repeat(64), identity: { cin: "CIN002", pan: "PAN001" } },
    ]);
    assert.equal(cinState.status, "conflict");
    assert.equal(cinState.field, "CIN");
    assert.equal(canAnalyzeFiles(files, false, cinState), false);
});

test("different PAN creates a conflict even when CIN matches", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN001", pan: "PAN002" } },
    ]);
    assert.equal(state.status, "conflict");
    assert.equal(state.field, "PAN");
    assert.match(state.error, /PAN mismatch/);
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("different CIN and PAN creates a conflict", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN002", pan: "PAN002" } },
    ]);
    assert.equal(state.status, "conflict");
    assert.match(state.error, /^B\.pdf has a CIN mismatch\./);
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("three matching identities verify the entire batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf"), pdf("C.pdf")].map(file => ({ file, name: file.name }));
    const cached = files.map(({ file }, index) => {
        file.fileHash = `${index}`.repeat(64);
        return { fileHash: file.fileHash, identity: { cin: "CIN001", pan: "PAN001", companyName: `NAME ${index}` } };
    });
    const state = getIdentityValidationState(files, cached);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("missing cached CIN blocks multi-PDF analysis", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{ fileHash: "a".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } }]);
    assert.equal(state.status, "incomplete");
    assert.match(state.error, /required CIN information/);
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("missing CIN blocks a multi-PDF batch even when PAN matches", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: null, pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
    ]);
    assert.equal(state.status, "incomplete");
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("missing PAN does not block a multi-PDF batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "CIN001", pan: null } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
    ]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("matching CIN and PAN remain valid when company names differ", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    const cached = files.map(({ file }, index) => {
        file.fileHash = `${index}`.repeat(64);
        return { fileHash: file.fileHash, identity: { cin: "CIN001", pan: "PAN001", companyName: `NAME ${index}` } };
    });
    assert.equal(getIdentityValidationState(files, cached).status, "verified");
});

test("removing a conflicting PDF revalidates the remaining selection", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const conflict = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN002", pan: "PAN002" } },
    ]);
    assert.equal(conflict.status, "conflict");

    const remaining = files.filter(({ name }) => name === "A.pdf");
    const revalidated = getIdentityValidationState(remaining, [{
        fileHash: "0".repeat(64),
        identity: { cin: "CIN001", pan: "PAN001" }
    }]);
    assert.equal(revalidated.status, "verified");
    assert.equal(canAnalyzeFiles(remaining, false, revalidated), true);
});

test("single PDF requires CIN even when company name is present", () => {
    const files = [{ file: pdf("A.pdf"), name: "A.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { companyName: "EXAMPLE LIMITED", cin: null, pan: null }
    }]);
    assert.equal(state.status, "incomplete");
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("single PDF without identity is blocked", () => {
    const files = [{ file: pdf("A.pdf"), name: "A.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { companyName: null, cin: null, pan: null }
    }]);
    assert.equal(state.status, "incomplete");
    assert.match(state.error, /required CIN information/);
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("pending-only batch remains processing without a completed id", () => {
    assert.deepEqual(getBatchResultState([{ filename: "A.pdf", status: "processing", documentId: null }]), {
        completedDocumentId: null,
        isProcessing: true,
        hasFailure: false
    });
});

test("completed batch remains on the normal analyzing path", () => {
    assert.deepEqual(getBatchResultState([{ filename: "A.pdf", status: "completed", documentId: 42 }]), {
        completedDocumentId: 42,
        isProcessing: false,
        hasFailure: false
    });
});

test("quota failure uses the stable backend code", () => {
    const state = getBatchResultState([{ filename: "A.pdf", status: "failed", code: "UPLOAD_QUOTA_EXCEEDED", error: "Your upload limit has been reached." }]);
    assert.equal(state.failure.type, "quota");
    assert.equal(state.failure.code, "UPLOAD_QUOTA_EXCEEDED");
});

test("authorization failure uses the stable backend code", () => {
    assert.equal(classifyUploadFailure({ status: "failed", code: "COMPANY_UPLOAD_FORBIDDEN", error: "User is not authorized." }).type, "authorization");
});

test("extraction failure is classified from the backend message", () => {
    assert.equal(classifyUploadFailure({ status: "failed", error: "Extraction failed while parsing the PDF." }).type, "extraction");
});

test("a mixed batch exposes failure before its completed document", () => {
    const state = getBatchResultState([
        { filename: "good.pdf", status: "completed", documentId: 42 },
        { filename: "bad.pdf", status: "failed", error: "Invalid file." }
    ]);
    assert.equal(state.completedDocumentId, 42);
    assert.equal(state.failure.type, "invalid-file");
});

test("an all-failed batch has no analyzing document", () => {
    const state = getBatchResultState([
        { filename: "A.pdf", status: "failed", error: "Duplicate file." },
        { filename: "B.pdf", status: "failed", error: "Extraction failed." }
    ]);
    assert.equal(state.completedDocumentId, null);
    assert.equal(state.isProcessing, false);
    assert.equal(state.failure.type, "duplicate");
});

test("HTTP 200 with a failed document is still a failed upload workflow", () => {
    const response = { status: 200, documents: [{ filename: "A.pdf", status: "failed", error: "Your upload limit has been reached." }] };
    const state = getBatchResultState(response.documents);
    assert.equal(response.status, 200);
    assert.equal(state.hasFailure, true);
    assert.equal(state.failure.type, "quota");
});

test("company name alone is insufficient for a multi-PDF batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    const cached = files.map(({ file }) => {
        file.fileHash = file.name;
        return { fileHash: file.fileHash, identity: { cin: null, pan: null, companyName: "SAME COMPANY" } };
    });
    const state = getIdentityValidationState(files, cached);
    assert.equal(state.status, "incomplete");
    assert.match(state.error, /required CIN information/);
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("single PDF with CIN and no PAN enables analysis", () => {
    const files = [{ file: pdf("A.pdf"), name: "A.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { cin: " u12345hr2010ptc123456 ", pan: null }
    }]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("single PDF with a different company CIN is blocked", () => {
    const files = [{ file: pdf("financial_1ANnnnnnnnnnnnnnnnnnn.pdf"), name: "financial_1ANnnnnnnnnnnnnnnnnnn.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { cin: "U24100PB2022PLC055213", pan: null }
    }], "U12345HR2010PTC123456");
    assert.equal(state.status, "conflict");
    assert.equal(state.field, "CIN");
    assert.equal(canAnalyzeFiles(files, false, state), false);
});

test("CIN and PAN normalization prevents false conflicts", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "U12345HR2010PTC123456", pan: "ABCDE1234F" } },
        { fileHash: "1".repeat(64), identity: { cin: " u12345hr2010ptc123456 ", pan: " abcde1234f " } },
    ]);
    assert.equal(state.status, "verified");
});