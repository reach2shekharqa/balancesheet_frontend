export function resolveCompanyId(company) {
    if (!company || typeof company !== "object") {
        return null;
    }

    const rawCompanyId = company.companyId ?? company.id ?? company.company_id ?? null;
    if (rawCompanyId === undefined || rawCompanyId === null || rawCompanyId === "") {
        return null;
    }

    return String(rawCompanyId);
}

export function toActiveCompany(company) {
    if (!company) {
        return null;
    }

    const companyId = resolveCompanyId(company);
    return {
        companyId: companyId || undefined,
        companyName: company.companyName || company.name || "",
        cin: company.cin || "",
        pan: company.pan || "",
        accessRole: company.accessRole || company.role || "",
    };
}
