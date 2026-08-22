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

export function canAnalyzeFiles(selectedFiles, uploading, identityState = { status: "idle" }) {
    return selectedFiles.length > 0 && !uploading && identityState.status === "verified";
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
        cin: identity.cin ? String(identity.cin).replace(/[\s-]+/g, "").toUpperCase() : null,
        pan: identity.pan ? String(identity.pan).replace(/[\s-]+/g, "").toUpperCase() : null,
    }));
    const conflictField = ["cin", "pan"].find(field => {
        const values = normalizedIdentities.map(identity => identity[field]).filter(Boolean);
        return values.length > 1 && values.some(value => value !== values[0]);
    });
    if (conflictField) {
        const referenceValue = normalizedIdentities.find(identity => identity[conflictField])?.[conflictField];
        const conflict = normalizedIdentities.find(identity => identity[conflictField] && identity[conflictField] !== referenceValue);
        const error = conflictField === "pan"
            ? `${conflict.filename} contains conflicting company identity information. Please remove this file to continue.`
            : `${conflict.filename} doesn't match the other selected reports. Please remove this file to continue.`;
        return { status: "conflict", identities, error, filename: conflict.filename, field: conflictField.toUpperCase() };
    }
    return { status: "verified", identities, error: "" };
}

export function getBatchResultState(documents) {
    const completedDocument = documents.find(document => document.documentId && document.status === "completed");
    const isProcessing = documents.some(document => ["processing", "waiting"].includes(document.status));
    const hasFailure = documents.some(document => document.status === "failed");

    return {
        completedDocumentId: completedDocument?.documentId ?? null,
        isProcessing,
        hasFailure,
    };
}