function nonNegativeNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function displayNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function getAdminQuotaSummary(user = {}) {
    const uploadsUsed = nonNegativeNumber(user.uploadsUsed);
    const uploadQuota = nonNegativeNumber(user.uploadQuota ?? user.uploadLimit);
    const storageUsedMb = nonNegativeNumber(user.storageUsedMb);
    const storageLimitMb = nonNegativeNumber(user.storageLimitMb);
    const uploadsRemaining = uploadsUsed !== null && uploadQuota !== null ? Math.max(uploadQuota - uploadsUsed, 0) : null;
    const storageRemainingMb = storageUsedMb !== null && storageLimitMb !== null ? Math.max(storageLimitMb - storageUsedMb, 0) : null;

    return {
        uploads: uploadsUsed !== null && uploadQuota !== null ? `${displayNumber(uploadsUsed)} / ${displayNumber(uploadQuota)}` : "Unavailable",
        uploadsRemaining: uploadsRemaining === null ? "Unavailable" : `${displayNumber(uploadsRemaining)} remaining`,
        storage: storageUsedMb !== null && storageLimitMb !== null ? `${displayNumber(storageUsedMb)} MB / ${displayNumber(storageLimitMb)} MB` : "Unavailable",
        storageRemaining: storageRemainingMb === null ? "Unavailable" : `${displayNumber(storageRemainingMb)} MB remaining`,
        statuses: [
            ...(uploadsRemaining === null ? ["Upload quota unavailable"] : uploadsRemaining === 0 ? ["Quota reached"] : ["Uploads available"]),
            ...(storageRemainingMb === null ? ["Storage limit unavailable"] : storageRemainingMb === 0 ? ["Storage limit reached"] : [])
        ],
        uploadsRemainingValue: uploadsRemaining,
        storageRemainingValue: storageRemainingMb
    };
}