import assert from "node:assert/strict";
import test from "node:test";
import { getAdminQuotaSummary } from "./adminQuota.js";

test("0 / 0 is quota reached", () => {
    const summary = getAdminQuotaSummary({ uploadsUsed: 0, uploadQuota: 0 });
    assert.equal(summary.uploads, "0 / 0");
    assert.equal(summary.uploadsRemaining, "0 remaining");
    assert.ok(summary.statuses.includes("Quota reached"));
});

test("1 / 1 is quota reached", () => {
    assert.ok(getAdminQuotaSummary({ uploadsUsed: 1, uploadQuota: 1 }).statuses.includes("Quota reached"));
});

test("1 / 5 has four uploads remaining", () => {
    assert.equal(getAdminQuotaSummary({ uploadsUsed: 1, uploadQuota: 5 }).uploadsRemaining, "4 remaining");
});

test("5 / 5 has no uploads remaining", () => {
    assert.equal(getAdminQuotaSummary({ uploadsUsed: 5, uploadQuota: 5 }).uploadsRemaining, "0 remaining");
});

test("usage above quota is clamped at zero", () => {
    const summary = getAdminQuotaSummary({ uploadsUsed: 6, uploadQuota: 5 });
    assert.equal(summary.uploadsRemaining, "0 remaining");
    assert.equal(summary.uploadsRemainingValue, 0);
});

test("storage usage and remaining values are calculated independently", () => {
    const summary = getAdminQuotaSummary({ storageUsedMb: 120, storageLimitMb: 500 });
    assert.equal(summary.storage, "120 MB / 500 MB");
    assert.equal(summary.storageRemaining, "380 MB remaining");
});

test("missing quota values have an explicit fallback", () => {
    const summary = getAdminQuotaSummary({ uploadsUsed: null, uploadQuota: null, storageUsedMb: 10, storageLimitMb: null });
    assert.equal(summary.uploads, "Unavailable");
    assert.equal(summary.uploadsRemaining, "Unavailable");
    assert.equal(summary.storage, "Unavailable");
    assert.ok(summary.statuses.includes("Upload quota unavailable"));
    assert.ok(summary.statuses.includes("Storage limit unavailable"));
});

test("multiple users retain independent quota summaries", () => {
    const users = [
        { uploadsUsed: 1, uploadQuota: 5 },
        { uploadsUsed: 5, uploadQuota: 5 }
    ].map(getAdminQuotaSummary);
    assert.equal(users[0].uploadsRemaining, "4 remaining");
    assert.equal(users[1].uploadsRemaining, "0 remaining");
});