import test from "node:test";
import assert from "node:assert/strict";
import { canAnalyzeFiles, getBatchResultState, getFileIdentity, mergeUniqueFiles, removeFileByIdentity } from "./uploadBatchState.js";

function pdf(name, lastModified = 1) {
    return { name, size: 10, lastModified };
}

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
});

test("pending-only batch remains processing without a completed id", () => {
    assert.deepEqual(getBatchResultState([{ filename: "A.pdf", status: "processing", documentId: null }]), {
        completedDocumentId: null,
        isProcessing: true,
        hasFailure: false
    });
});