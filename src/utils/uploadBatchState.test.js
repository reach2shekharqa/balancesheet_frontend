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

test("different CIN values do not block analysis anymore", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files[0].file.fileHash = "a".repeat(64);
    files[1].file.fileHash = "b".repeat(64);
    const state = getIdentityValidationState(files, [
        { fileHash: "a".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "b".repeat(64), identity: { cin: "CIN002", pan: "PAN001" } },
    ]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("different PAN values do not block analysis anymore", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN001", pan: "PAN002" } },
    ]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("missing CIN values no longer block a batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: null, pan: "PAN001" } },
        { fileHash: "1".repeat(64), identity: { cin: "CIN001", pan: "PAN001" } },
    ]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("company name alone is sufficient for a batch", () => {
    const files = [pdf("A.pdf"), pdf("B.pdf")].map(file => ({ file, name: file.name }));
    files.forEach(({ file }, index) => { file.fileHash = `${index}`.repeat(64); });
    const state = getIdentityValidationState(files, [
        { fileHash: "0".repeat(64), identity: { cin: null, pan: null, companyName: "SAME COMPANY" } },
        { fileHash: "1".repeat(64), identity: { cin: null, pan: null, companyName: "SAME COMPANY" } },
    ]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("single PDF with only a company name is accepted without CIN", () => {
    const files = [{ file: pdf("A.pdf"), name: "A.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { companyName: "EXAMPLE LIMITED", cin: null, pan: null }
    }]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
});

test("single PDF without any identity metadata is still allowed", () => {
    const files = [{ file: pdf("A.pdf"), name: "A.pdf" }];
    files[0].file.fileHash = "a".repeat(64);
    const state = getIdentityValidationState(files, [{
        fileHash: "a".repeat(64),
        identity: { companyName: null, cin: null, pan: null }
    }]);
    assert.equal(state.status, "verified");
    assert.equal(canAnalyzeFiles(files, false, state), true);
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