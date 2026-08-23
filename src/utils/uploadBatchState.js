export function getFileIdentity(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

export function mergeUniqueFiles(existingEntries, files) {
    const identities = new Set(existingEntries.map(({ file }) => getFileIdentity(file)));
    return Array.from(files || []).filter(file => {
        const identity = getFileIdentity(file);
        if (identities.has(identity)) return false;
        identities.add(identity);
        return true;
    });
}

export function removeFileByIdentity(entries, identity) {
    return entries.filter(({ file }) => getFileIdentity(file) !== identity);
}

export function canAnalyzeFiles(selectedFiles, uploading, identityState = { status: "idle" }, requireIdentity = true) {
    return selectedFiles.length > 0 && !uploading && (!requireIdentity || identityState.status === "verified");
}

export function canUploadForCompany(company) {
    return !company || company.accessRole === "OWNER";
}

export function getIdentityValidationState(selectedFiles, cachedIdentities = []) {
    if (selectedFiles.length === 0) return { status: "idle", identities: [], error: "" };

    const identitiesByHash = new Map(cachedIdentities.map(item => [item.fileHash, item.identity]));
    const identities = selectedFiles.map(({ file, name }) => ({
        filename: name,
        ...(identitiesByHash.get(file.fileHash) ?? {})
    }));
    const failed = identities.find(identity => identity.status === "error");
    if (failed) {
        return {
            status: "error",
            identities,
            error: `${failed.filename} doesn't contain the required CIN information. Please remove this file or upload a report containing the required company details.`,
            filename: failed.filename
        };
    }
    const unavailable = identities.find(identity => !identity.cin);
    if (selectedFiles.length === 1) {
        const identity = identities[0];
        if (!identity.cin) {
            return { status: "incomplete", identities, error: `${identity.filename} doesn't contain the required CIN information. Please remove this file or upload a report containing the required company details.`, filename: identity.filename };
        }
        return { status: "verified", identities, error: "" };
    }
    if (unavailable) {
        return { status: "incomplete", identities, error: `${unavailable.filename} doesn't contain the required CIN information. Please remove this file to continue.`, filename: unavailable.filename };
    }
    const normalizedIdentities = identities.map(identity => ({
        ...identity,
        cin: identity.cin ? String(identity.cin).replace(/[\s:;,#|/-]+/g, "").toUpperCase() : null,
        pan: identity.pan ? String(identity.pan).replace(/[\s:;,#|/-]+/g, "").toUpperCase() : null,
    }));
    const conflictField = ["cin", "pan"].find(field => {
        const values = normalizedIdentities.map(identity => identity[field]).filter(Boolean);
        return values.length > 1 && values.some(value => value !== values[0]);
    });
    if (conflictField) {
        const referenceValue = normalizedIdentities.find(identity => identity[conflictField])?.[conflictField];
        const conflict = normalizedIdentities.find(identity => identity[conflictField] && identity[conflictField] !== referenceValue);
        const label = conflictField.toUpperCase();
        const error = `${conflict.filename} has a ${label} mismatch. Its ${label} is ${conflict[conflictField]}, but the other selected reports use ${referenceValue}. Please remove this file to continue.`;
        return { status: "conflict", identities, error, filename: conflict.filename, field: conflictField.toUpperCase() };
    }
    return { status: "verified", identities, error: "" };
}

export function getBatchResultState(documents) {
    const completedDocument = documents.find(document => document.documentId && document.status === "completed");
    const isProcessing = documents.some(document => ["processing", "waiting"].includes(document.status));
    const failedDocument = documents.find(document => document.status === "failed");

    return {
        completedDocumentId: completedDocument?.documentId ?? null,
        isProcessing,
        hasFailure: Boolean(failedDocument),
        ...(failedDocument ? { failure: classifyUploadFailure(failedDocument) } : {}),
    };
}

const UPLOAD_FAILURE_CODES = Object.freeze({
    QUOTA: "UPLOAD_QUOTA_EXCEEDED",
    STORAGE_QUOTA: "STORAGE_QUOTA_EXCEEDED",
    AUTHORIZATION: "COMPANY_UPLOAD_FORBIDDEN",
    INVALID_FILE: "INVALID_FILE",
    DUPLICATE: "DUPLICATE_FILE",
    EXTRACTION: "EXTRACTION_FAILED",
    UNKNOWN: "UPLOAD_FAILED",
});

export function classifyUploadFailure(document = {}) {
    const code = document.code || document.errorCode || "";
    const message = document.error || document.message || "Upload failed.";
    const normalizedMessage = String(message).toLowerCase();

    if (code === "STORAGE_QUOTA_EXCEEDED" || /storage\s+quota/i.test(normalizedMessage)) {
        return { ...document, type: "storage-quota", code: UPLOAD_FAILURE_CODES.STORAGE_QUOTA, message };
    }
    if (code === "UPLOAD_QUOTA_EXCEEDED" || /upload\s+(limit|quota)|upload\s+quota\s+(exceeded|reached)/i.test(normalizedMessage)) {
        return { ...document, type: "quota", code: UPLOAD_FAILURE_CODES.QUOTA, message };
    }
    if (code === "COMPANY_UPLOAD_FORBIDDEN" || /not authorized|permission|forbidden|unauthorized/i.test(normalizedMessage)) {
        return { ...document, type: "authorization", code: UPLOAD_FAILURE_CODES.AUTHORIZATION, message };
    }
    if (code === "INVALID_FILE" || /invalid file|unsupported file|pdf file is required|file type/i.test(normalizedMessage)) {
        return { ...document, type: "invalid-file", code: UPLOAD_FAILURE_CODES.INVALID_FILE, message };
    }
    if (code === "DUPLICATE_FILE" || /duplicate|already exists|already uploaded|rejected/i.test(normalizedMessage)) {
        return { ...document, type: "duplicate", code: UPLOAD_FAILURE_CODES.DUPLICATE, message };
    }
    if (code === "EXTRACTION_FAILED" || /extract|extraction|parse/i.test(normalizedMessage)) {
        return { ...document, type: "extraction", code: UPLOAD_FAILURE_CODES.EXTRACTION, message };
    }
    return { ...document, type: "unknown", code: code || UPLOAD_FAILURE_CODES.UNKNOWN, message };
}