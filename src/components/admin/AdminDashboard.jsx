import { useEffect, useState } from "react";
import "./admin.css";
import { getAdminQuotaSummary } from "./adminQuota";
import StatusMessage from "../StatusMessage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

async function adminRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Admin request failed.");
    return result;
}

function date(value) {
    return value ? new Date(value).toLocaleString() : "-";
}

function Stat({ label, value }) {
    return <article className="admin-stat"><span>{label}</span><strong>{value ?? 0}</strong></article>;
}

function UserDetails({ userId, onBack }) {
    const [user, setUser] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [availableCompanies, setAvailableCompanies] = useState([]);
    const [accessForm, setAccessForm] = useState({ companyId: "", accessRole: "CONSUMER" });
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (userId === "__companies__") return;
        Promise.all([adminRequest(`/admin/users/${encodeURIComponent(userId)}`), adminRequest("/admin/companies")])
            .then(([userResult, companyResult]) => { setUser(userResult.user); setCompanies(userResult.user.companies ?? []); setAvailableCompanies(companyResult.companies); })
            .catch(error => setError(error.message));
    }, [userId]);
    async function refreshUser() {
        const result = await adminRequest(`/admin/users/${encodeURIComponent(userId)}`);
        setUser(result.user);
        setCompanies(result.user.companies ?? []);
    }
    async function update(path, body) {
        setBusy(true); setError("");
        try { await adminRequest(`/admin/users/${encodeURIComponent(userId)}/${path}`, { method: "PATCH", body: JSON.stringify(body) }); await refreshUser(); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    async function addAccess(event) {
        event.preventDefault(); setBusy(true); setError(""); setMessage("");
        try { await adminRequest(`/admin/users/${encodeURIComponent(userId)}/companies`, { method: "POST", body: JSON.stringify(accessForm) }); await refreshUser(); setAccessForm({ companyId: "", accessRole: "CONSUMER" }); setMessage("Company access assigned."); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    async function changeAccess(companyId, accessRole) {
        setBusy(true); setError(""); setMessage("");
        try { await adminRequest(`/admin/users/${encodeURIComponent(userId)}/companies/${companyId}`, { method: "PATCH", body: JSON.stringify({ accessRole }) }); await refreshUser(); setMessage("Membership role changed."); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    async function removeAccess(companyId) {
        if (!window.confirm("Remove this user's company access?")) return;
        setBusy(true); setError(""); setMessage("");
        try { await adminRequest(`/admin/users/${encodeURIComponent(userId)}/companies/${companyId}`, { method: "DELETE" }); await refreshUser(); setMessage("Company access removed."); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    async function clearUserData() {
        const confirmed = window.confirm("Clear all user data?\n\nThis will permanently delete all documents uploaded by this user\nand all associated extracted/processed financial data.\n\nThis action cannot be undone.");
        if (!confirmed) return;
        setBusy(true); setError(""); setMessage("");
        try { const result = await adminRequest(`/admin/users/${encodeURIComponent(userId)}/data`, { method: "DELETE" }); await refreshUser(); setMessage(`${result.deleted.documents} document${result.deleted.documents === 1 ? "" : "s"} and associated user data cleared.`); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    async function permanentlyDeleteUser() {
        const confirmation = window.prompt(`This permanently deletes ${user.userName}, all documents, memberships, subscriptions, and stored data.\n\nType the user ID to confirm:\n${user.userId}`);
        if (confirmation !== user.userId) return;
        setBusy(true); setError(""); setMessage("");
        try { await adminRequest(`/admin/users/${encodeURIComponent(userId)}/permanent`, { method: "DELETE", body: JSON.stringify({ confirmation }) }); onBack(); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    if (userId === "__companies__") return <CompanyTable onBack={onBack} />;
    if (error) return <section className="admin-panel"><button onClick={onBack}>Back</button><StatusMessage message={error} tone="error" persist /></section>;
    if (!user) return <section className="admin-panel">Loading user...</section>;
    return <section className="admin-panel admin-user-detail">
        <button className="admin-back" onClick={onBack}>Back to users</button>
        <div className="admin-title-row admin-user-heading"><div><span className="admin-kicker">Account profile</span><h2>{user.userName}</h2><p>{user.email} <span aria-hidden="true">·</span> <code>{user.userId}</code></p></div><span className={`admin-badge ${user.isDeleted ? "danger" : user.isActive ? "good" : "muted"}`}>{user.isDeleted ? "Deleted" : user.isActive ? "Active" : "Inactive"}</span></div>
        <StatusMessage message={message} />
        <QuotaDisplay user={user} />
        <div className="admin-actions"><button disabled={busy} onClick={() => update("role", { role: user.role === "admin" ? "user" : "admin" })}>{user.role === "admin" ? "Make user" : "Make admin"}</button><button disabled={busy || user.isDeleted} onClick={() => update("status", { isActive: !user.isActive })}>{user.isActive ? "Deactivate" : "Activate"}</button><button disabled={busy || user.isDeleted} onClick={() => { const value = Number(window.prompt("New upload limit", user.uploadLimit)); if (Number.isSafeInteger(value) && value >= 0) update("quota", { uploadLimit: value }); }}>Change upload limit</button><button disabled={busy || user.isDeleted} onClick={() => { const value = Number(window.prompt("New storage limit in MB", user.storageLimitMb ?? 0)); if (Number.isSafeInteger(value) && value >= 0) update("storage", { storageLimitMb: value }); }}>Change storage limit</button><button className="danger-button" disabled={busy || user.isDeleted} onClick={clearUserData}>Clear User Data</button><button className="danger-button" disabled={busy || user.isDeleted} onClick={() => { const reason = window.prompt("Reason for soft deletion"); if (reason) adminRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify({ reason }) }).then(() => setUser(current => ({ ...current, isDeleted: true, isActive: false }))).catch(error => setError(error.message)); }}>Delete user</button><button className="danger-button permanent-delete-button" disabled={busy} onClick={permanentlyDeleteUser}>Permanently delete</button></div>
        <h3>Company access</h3>
        {user.isDeleted ? <p>Deleted users cannot have active company access.</p> : <>
            <form className="admin-inline-form" onSubmit={addAccess}><select value={accessForm.companyId} onChange={event => setAccessForm(current => ({ ...current, companyId: event.target.value }))} required><option value="">Select company</option>{availableCompanies.filter(company => !companies.some(item => String(item.companyId) === String(company.companyId))).map(company => <option key={company.companyId} value={company.companyId}>{company.companyName} ({company.cin})</option>)}</select><select value={accessForm.accessRole} onChange={event => setAccessForm(current => ({ ...current, accessRole: event.target.value }))}><option value="OWNER">OWNER</option><option value="CONSUMER">CONSUMER</option></select><button type="submit" disabled={busy}>Add access</button></form>
            <div className="admin-list">{companies.length ? companies.map(company => <div key={company.companyId}><strong>{company.companyName}</strong><span><select value={company.accessRole} disabled={busy} onChange={event => changeAccess(company.companyId, event.target.value)}><option value="OWNER">OWNER</option><option value="CONSUMER">CONSUMER</option></select><button className="danger-link" disabled={busy} onClick={() => removeAccess(company.companyId)}>Remove</button></span></div>) : <p>No company access.</p>}</div>
        </>}
        <h3>Documents</h3><div className="admin-list">{user.documents?.length ? user.documents.map(document => <div key={document.id}><strong>{document.originalFilename}</strong><span>{document.status} · {date(document.uploadedAt)} · {document.fileSizeMb} MB</span></div>) : <p>No documents.</p>}</div>
    </section>;
}

export default function AdminDashboard({ user, onLogout }) {
    const [path, setPath] = useState(window.location.pathname);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [createForm, setCreateForm] = useState({ userName: "", email: "", password: "" });
    const [createMessage, setCreateMessage] = useState("");
    const [creatingUser, setCreatingUser] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const navigate = next => { window.history.pushState({}, "", next); setPath(next); setData(null); setError(""); };
    useEffect(() => { const handler = () => setPath(window.location.pathname); window.addEventListener("popstate", handler); return () => window.removeEventListener("popstate", handler); }, []);
    useEffect(() => {
        if (path === "/admin/settings") return;
        let endpoint = path === "/admin" ? "/admin/dashboard" : path === "/admin/documents" ? `/admin/documents?search=${encodeURIComponent(search)}` : path === "/admin/audit-logs" ? "/admin/audit-logs" : path === "/admin/companies" ? "/admin/companies/manage" : `/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`;
        if (path.match(/^\/admin\/users\//)) return;
        adminRequest(endpoint).then(setData).catch(error => setError(error.message));
    }, [path, search, filter]);
    const detailId = path === "/admin/companies" ? "__companies__" : path.match(/^\/admin\/users\/(.+)$/)?.[1];
    const nav = (label, href) => <>{<button className={path === href ? "active" : ""} onClick={() => navigate(href)}>{label}</button>}{label === "Users" && <button className={path === "/admin/companies" ? "active" : ""} onClick={() => navigate("/admin/companies")}>Companies</button>}</>;
    async function createNormalUser(event) { event.preventDefault(); const submitButton = event.currentTarget.querySelector('button[type="submit"]'); if (creatingUser || submitButton?.disabled) return; if (submitButton) submitButton.disabled = true; setCreatingUser(true); setCreateMessage(""); try { await adminRequest("/admin/users", { method: "POST", body: JSON.stringify(createForm) }); setCreateForm({ userName: "", email: "", password: "" }); setCreateMessage("User created."); setData(await adminRequest(`/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`)); } catch (error) { setCreateMessage(error.message); } finally { if (submitButton) submitButton.disabled = false; setCreatingUser(false); } }
    function toggleUserSelection(userId) { setSelectedUserIds(current => current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]); }
    function toggleAllUsers() { const visibleUserIds = (data?.users ?? []).map(item => item.userId); setSelectedUserIds(current => current.length === visibleUserIds.length ? [] : visibleUserIds); }
    async function deleteSelectedUsers() {
        if (!selectedUserIds.length) return;
        const reason = window.prompt(`Reason for deleting ${selectedUserIds.length} user${selectedUserIds.length === 1 ? "" : "s"}`);
        if (!reason) return;
        setError("");
        try {
            await Promise.all(selectedUserIds.map(userId => adminRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify({ reason }) })));
            setSelectedUserIds([]);
            setData(await adminRequest(`/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`));
        } catch (error) { setError(error.message); }
    }
    return <div className="admin-app"><aside className="admin-sidebar"><div className="admin-brand"><span>₹</span><strong>Admin<br />Dashboard</strong></div><p>Control room</p>{nav("Overview", "/admin")}{nav("Users", "/admin/users")}{nav("Documents", "/admin/documents")}{nav("Audit Logs", "/admin/audit-logs")}{nav("Settings", "/admin/settings")}<button className="admin-logout" onClick={onLogout}>Log out</button></aside><main className="admin-main"><header className="admin-header"><div><span className="admin-kicker">Financial Analyzer / Admin</span><h1>{detailId ? "User details" : path === "/admin/users" ? "Users" : path === "/admin/documents" ? "Documents" : path === "/admin/audit-logs" ? "Audit logs" : "Overview"}</h1></div><span className="admin-user">{user.email}</span></header>{detailId ? <UserDetails userId={decodeURIComponent(detailId)} onBack={() => navigate("/admin/users")} /> : error ? <div className="admin-panel admin-error">{error}</div> : path === "/admin/settings" ? <section className="admin-panel"><h2>Settings</h2><p>Administrative controls use the production database role and existing account limits.</p></section> : <section className="admin-panel">{path === "/admin" && data?.statistics && <div className="admin-stats"><Stat label="Total users" value={data.statistics.total_users} /><Stat label="Active users" value={data.statistics.active_users} /><Stat label="Deleted users" value={data.statistics.deleted_users} /><Stat label="Total uploads" value={data.statistics.total_uploads} /><Stat label="Storage used (MB)" value={data.statistics.total_storage_used_mb} /><Stat label="Documents" value={data.statistics.total_documents} /><Stat label="Admins" value={data.statistics.admin_count} /></div>}{path !== "/admin" && <div className="admin-toolbar"><input placeholder="Search email, name, ID..." value={search} onChange={event => setSearch(event.target.value)} />{path === "/admin/users" && <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All users</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="deleted">Deleted</option><option value="admin">Admins</option><option value="user">Users</option></select>}</div>}{path === "/admin/users" && <form className="admin-create-form" onSubmit={createNormalUser}><input placeholder="Name" value={createForm.userName} onChange={event => setCreateForm(current => ({ ...current, userName: event.target.value }))} required /><input placeholder="Email" type="email" value={createForm.email} onChange={event => setCreateForm(current => ({ ...current, email: event.target.value }))} required /><input placeholder="Password (8+ characters)" type="password" minLength="8" value={createForm.password} onChange={event => setCreateForm(current => ({ ...current, password: event.target.value }))} required /><button type="submit">Create user</button>{createMessage && <span>{createMessage}</span>}</form>}{path === "/admin/users" && <div className="admin-bulk-actions"><span>{selectedUserIds.length ? `${selectedUserIds.length} selected` : "Select users to delete"}</span><button className="danger-button" disabled={!selectedUserIds.length} onClick={deleteSelectedUsers}>Delete selected</button></div>}{path === "/admin" && <><h2>Recent activity</h2><Activity rows={data?.recentActivity} /></>}{path === "/admin/users" && <UserTable users={data?.users} selectedUserIds={selectedUserIds} onSelect={id => navigate(`/admin/users/${encodeURIComponent(id)}`)} onToggle={toggleUserSelection} onToggleAll={toggleAllUsers} />}{path === "/admin/documents" && <DocumentTable documents={data?.documents} onDelete={async id => { if (window.confirm("Delete this document and its related records?")) { await adminRequest(`/admin/documents/${id}`, { method: "DELETE" }); setData(await adminRequest(`/admin/documents?search=${encodeURIComponent(search)}`)); } }} />}{path === "/admin/audit-logs" && <Activity rows={data?.logs} />}</section>}</main></div>;
}

function Activity({ rows = [] }) {
    async function clearAuditLogs() {
        if (!window.confirm("Clear all audit logs? This cannot be undone.")) return;
        try {
            await adminRequest("/admin/audit-logs", { method: "DELETE" });
            window.location.reload();
        } catch (error) {
            window.alert(error.message);
        }
    }
    const isAuditLogPage = window.location.pathname === "/admin/audit-logs";
    return <><div className="admin-bulk-actions">{isAuditLogPage && <button className="danger-button permanent-delete-button" onClick={clearAuditLogs}>Clear all audit logs</button>}</div><div className="admin-list">{rows.length ? rows.map(row => <div key={row.id}><strong>{row.action}</strong><span>{row.actorName || row.actorEmail || "Admin"} · {row.targetType} {row.targetId || ""} · {date(row.createdAt)}</span></div>) : <p>No activity recorded.</p>}</div></>;
}
function QuotaDisplay({ user }) { const summary = getAdminQuotaSummary(user); return <div className="admin-quota-grid"><div className="admin-quota-block"><span>Uploads</span><strong>{summary.uploads}</strong><small>{summary.uploadsRemaining}</small></div><div className="admin-quota-block"><span>Storage</span><strong>{summary.storage}</strong><small>{summary.storageRemaining}</small></div><div className="admin-quota-status" aria-label="Quota status">{summary.statuses.map(status => <span key={status}>{status}</span>)}</div></div>; }
function CompanyTable({ onBack }) {
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => { adminRequest("/admin/companies/manage").then(result => setCompanies(result.companies ?? [])).catch(error => setError(error.message)); }, []);
    const allSelected = companies.length > 0 && companies.every(company => selectedCompanyIds.includes(company.companyId));
    const toggleAll = () => setSelectedCompanyIds(allSelected ? [] : companies.map(company => company.companyId));
    const toggle = companyId => setSelectedCompanyIds(current => current.includes(companyId) ? current.filter(id => id !== companyId) : [...current, companyId]);
    async function deleteSelected(companyIds = selectedCompanyIds) {
        const confirmation = window.prompt(`This permanently deletes ${companyIds.length} selected compan${companyIds.length === 1 ? "y" : "ies"}, removes memberships, and detaches linked documents.\n\nType DELETE COMPANIES to confirm.`);
        if (confirmation !== "DELETE COMPANIES") return;
        try { await adminRequest("/admin/companies", { method: "DELETE", body: JSON.stringify({ companyIds }) }); setCompanies(current => current.filter(company => !companyIds.includes(company.companyId))); setSelectedCompanyIds([]); }
        catch (requestError) { setError(requestError.message); }
    }
    return <section className="admin-panel admin-company-detail"><button className="admin-back" onClick={onBack}>Back to users</button><div className="admin-title-row admin-user-heading"><div><span className="admin-kicker">Workspace</span><h2>Companies</h2><p>Manage company records and access memberships.</p></div></div>{error && <p className="admin-error">{error}</p>}<div className="admin-bulk-actions"><span>{selectedCompanyIds.length ? `${selectedCompanyIds.length} selected` : "Select companies to manage"}</span><button className="danger-button permanent-delete-button" disabled={!selectedCompanyIds.length} onClick={() => deleteSelected()}>Delete selected companies</button></div><div className="admin-table admin-company-table"><div className="admin-table-header"><label><input type="checkbox" aria-label="Select all companies" checked={allSelected} onChange={toggleAll} /> Select all</label><span>Company</span><span>CIN</span><span>PAN</span><span>Users</span><span>Documents</span><span>Action</span></div>{companies.length ? companies.map(company => <div className="admin-user-row" key={company.companyId}><input type="checkbox" aria-label={`Select ${company.companyName}`} checked={selectedCompanyIds.includes(company.companyId)} onChange={() => toggle(company.companyId)} /><strong>{company.companyName || "Unnamed company"}</strong><span>{company.cin}</span><span>{company.pan || "-"}</span><span>{company.userCount}</span><span>{company.documentCount}</span><button className="danger-link" onClick={() => deleteSelected([company.companyId])}>Delete</button></div>) : <p className="admin-empty-state">No active companies.</p>}</div></section>;
}
function UserTable({ users = [], selectedUserIds = [], onSelect, onToggle, onToggleAll }) {
    const allSelected = users.length > 0 && users.every(item => selectedUserIds.includes(item.userId));
    async function permanentlyDeleteSelected() {
        const confirmation = window.prompt(`This permanently deletes ${selectedUserIds.length} selected user${selectedUserIds.length === 1 ? "" : "s"}, including all documents and stored data.\n\nType PERMANENTLY DELETE to confirm.`);
        if (confirmation !== "PERMANENTLY DELETE") return;
        try {
            await adminRequest("/admin/users/permanent", { method: "DELETE", body: JSON.stringify({ userIds: selectedUserIds, confirmation }) });
            window.location.reload();
        } catch (error) {
            window.alert(error.message);
        }
    }
    return <>
        <div className="admin-bulk-actions"><span>{selectedUserIds.length ? `${selectedUserIds.length} selected` : "Select users to manage"}</span><button className="danger-button permanent-delete-button" disabled={!selectedUserIds.length} onClick={permanentlyDeleteSelected}>Permanently delete selected</button></div>
        <div className="admin-table admin-user-table"><div className="admin-table-header"><label><input type="checkbox" aria-label="Select all users" checked={allSelected} onChange={onToggleAll} /> Select all</label><span>Name</span><span>Email</span><span>Role</span><span>Companies</span><span>Uploads</span><span>Storage</span><span>Status</span></div>{users.map(item => { const summary = getAdminQuotaSummary(item); return <div className="admin-user-row" key={item.userId} role="button" tabIndex="0" onClick={() => onSelect(item.userId)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onSelect(item.userId); }}><input type="checkbox" aria-label={`Select ${item.userName}`} checked={selectedUserIds.includes(item.userId)} onClick={event => event.stopPropagation()} onChange={() => onToggle(item.userId)} /><strong>{item.userName}</strong><span>{item.email}</span><span>{item.role}</span><span>{item.companies?.length ? item.companies.map(company => `${company.companyName} - ${company.accessRole}`).join(", ") : "No company access"}</span><span className="admin-quota-cell"><b>Uploads</b>{summary.uploads}<small>{summary.uploadsRemaining}</small></span><span className="admin-quota-cell"><b>Storage</b>{summary.storage}<small>{summary.storageRemaining}</small></span><span className="admin-status-cell">{item.isDeleted ? "Deleted" : item.isActive ? "Active" : "Inactive"}<small>{summary.statuses.join(" / ")}</small></span></div>; })}</div>
    </>;
}
function DocumentTable({ documents = [], onDelete }) { return <div className="admin-table">{documents.map(item => <div key={item.id}><strong>{item.originalFilename}</strong><span>{item.ownerName || item.ownerEmail}</span><span>{date(item.uploadedAt)}</span><span>{item.sizeMb} MB</span><span>{item.status}</span><button className="danger-link" onClick={() => onDelete(item.id)}>Delete</button></div>)}</div>; }
