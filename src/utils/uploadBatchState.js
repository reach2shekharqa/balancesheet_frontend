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

export function canAnalyzeFiles(selectedFiles, uploading) {
    return selectedFiles.length > 0 && !uploading;
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