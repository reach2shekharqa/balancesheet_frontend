import { useEffect, useState } from "react";
import "./admin.css";

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
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { adminRequest(`/admin/users/${encodeURIComponent(userId)}`).then(result => setUser(result.user)).catch(error => setError(error.message)); }, [userId]);
    async function update(path, body) {
        setBusy(true); setError("");
        try { const result = await adminRequest(`/admin/users/${encodeURIComponent(userId)}/${path}`, { method: "PATCH", body: JSON.stringify(body) }); setUser(current => ({ ...current, ...result.user })); }
        catch (error) { setError(error.message); } finally { setBusy(false); }
    }
    if (error) return <section className="admin-panel"><button onClick={onBack}>Back</button><p className="admin-error">{error}</p></section>;
    if (!user) return <section className="admin-panel">Loading user...</section>;
    return <section className="admin-panel">
        <button className="admin-back" onClick={onBack}>Back to users</button>
        <div className="admin-title-row"><div><span className="admin-kicker">Account</span><h2>{user.userName}</h2><p>{user.email} · {user.userId}</p></div><span className={`admin-badge ${user.isDeleted ? "danger" : user.isActive ? "good" : "muted"}`}>{user.isDeleted ? "Deleted" : user.isActive ? "Active" : "Inactive"}</span></div>
        <div className="admin-detail-grid"><div><span>Role</span><strong>{user.role}</strong></div><div><span>Created</span><strong>{date(user.createdAt)}</strong></div><div><span>Uploads</span><strong>{user.uploadsUsed} / {user.uploadLimit}</strong></div><div><span>Storage</span><strong>{user.storageUsedMb} / {user.storageLimitMb ?? "-"} MB</strong></div></div>
        <div className="admin-actions"><button disabled={busy} onClick={() => update("role", { role: user.role === "admin" ? "user" : "admin" })}>{user.role === "admin" ? "Make user" : "Make admin"}</button><button disabled={busy || user.isDeleted} onClick={() => update("status", { isActive: !user.isActive })}>{user.isActive ? "Deactivate" : "Activate"}</button><button disabled={busy || user.isDeleted} onClick={() => { const value = Number(window.prompt("New upload limit", user.uploadLimit)); if (Number.isSafeInteger(value) && value >= 0) update("quota", { uploadLimit: value }); }}>Change upload limit</button><button disabled={busy || user.isDeleted} onClick={() => { const value = Number(window.prompt("New storage limit in MB", user.storageLimitMb ?? 0)); if (Number.isSafeInteger(value) && value >= 0) update("storage", { storageLimitMb: value }); }}>Change storage limit</button><button className="danger-button" disabled={busy || user.isDeleted} onClick={() => { const reason = window.prompt("Reason for soft deletion"); if (reason) adminRequest(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify({ reason }) }).then(() => setUser(current => ({ ...current, isDeleted: true, isActive: false }))).catch(error => setError(error.message)); }}>Delete user</button></div>
        <h3>Documents</h3><div className="admin-list">{user.documents?.length ? user.documents.map(document => <div key={document.id}><strong>{document.originalFilename}</strong><span>{document.status} · {date(document.uploadedAt)} · {document.fileSizeMb} MB</span></div>) : <p>No documents.</p>}</div>
    </section>;
}

export default function AdminDashboard({ user, onLogout }) {
    const [path, setPath] = useState(window.location.pathname);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const navigate = next => { window.history.pushState({}, "", next); setPath(next); setData(null); setError(""); };
    useEffect(() => { const handler = () => setPath(window.location.pathname); window.addEventListener("popstate", handler); return () => window.removeEventListener("popstate", handler); }, []);
    useEffect(() => {
        if (path === "/admin/settings") return;
        let endpoint = path === "/admin" ? "/admin/dashboard" : path === "/admin/documents" ? `/admin/documents?search=${encodeURIComponent(search)}` : path === "/admin/audit-logs" ? "/admin/audit-logs" : `/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`;
        if (path.match(/^\/admin\/users\//)) return;
        adminRequest(endpoint).then(setData).catch(error => setError(error.message));
    }, [path, search, filter]);
    const detailId = path.match(/^\/admin\/users\/(.+)$/)?.[1];
    const nav = (label, href) => <button className={path === href ? "active" : ""} onClick={() => navigate(href)}>{label}</button>;
    return <div className="admin-app"><aside className="admin-sidebar"><div className="admin-brand"><span>₹</span><strong>Admin<br />Dashboard</strong></div><p>Control room</p>{nav("Overview", "/admin")}{nav("Users", "/admin/users")}{nav("Documents", "/admin/documents")}{nav("Audit Logs", "/admin/audit-logs")}{nav("Settings", "/admin/settings")}<button className="admin-logout" onClick={onLogout}>Log out</button></aside><main className="admin-main"><header className="admin-header"><div><span className="admin-kicker">Financial Analyzer / Admin</span><h1>{detailId ? "User details" : path === "/admin/users" ? "Users" : path === "/admin/documents" ? "Documents" : path === "/admin/audit-logs" ? "Audit logs" : "Overview"}</h1></div><span className="admin-user">{user.email}</span></header>{detailId ? <UserDetails userId={decodeURIComponent(detailId)} onBack={() => navigate("/admin/users")} /> : error ? <div className="admin-panel admin-error">{error}</div> : path === "/admin/settings" ? <section className="admin-panel"><h2>Settings</h2><p>Administrative controls use the production database role and existing account limits.</p></section> : <section className="admin-panel">{path === "/admin" && data?.statistics && <div className="admin-stats"><Stat label="Total users" value={data.statistics.total_users} /><Stat label="Active users" value={data.statistics.active_users} /><Stat label="Deleted users" value={data.statistics.deleted_users} /><Stat label="Total uploads" value={data.statistics.total_uploads} /><Stat label="Storage used (MB)" value={data.statistics.total_storage_used_mb} /><Stat label="Documents" value={data.statistics.total_documents} /><Stat label="Admins" value={data.statistics.admin_count} /></div>}{path !== "/admin" && <div className="admin-toolbar"><input placeholder="Search email, name, ID..." value={search} onChange={event => setSearch(event.target.value)} />{path === "/admin/users" && <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All users</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="deleted">Deleted</option><option value="admin">Admins</option><option value="user">Users</option></select>}</div>}{path === "/admin" && <><h2>Recent activity</h2><Activity rows={data?.recentActivity} /></>}{path === "/admin/users" && <UserTable users={data?.users} onSelect={id => navigate(`/admin/users/${encodeURIComponent(id)}`)} />}{path === "/admin/documents" && <DocumentTable documents={data?.documents} onDelete={async id => { if (window.confirm("Delete this document and its related records?")) { await adminRequest(`/admin/documents/${id}`, { method: "DELETE" }); setData(await adminRequest(`/admin/documents?search=${encodeURIComponent(search)}`)); } }} />}{path === "/admin/audit-logs" && <Activity rows={data?.logs} />}</section>}</main></div>;
}

function Activity({ rows = [] }) { return <div className="admin-list">{rows.length ? rows.map(row => <div key={row.id}><strong>{row.action}</strong><span>{row.actorName || row.actorEmail || "Admin"} · {row.targetType} {row.targetId || ""} · {date(row.createdAt)}</span></div>) : <p>No activity recorded.</p>}</div>; }
function UserTable({ users = [], onSelect }) { return <div className="admin-table">{users.map(item => <button key={item.userId} onClick={() => onSelect(item.userId)}><strong>{item.userName}</strong><span>{item.email}</span><span>{item.role}</span><span>{item.uploadsUsed} / {item.uploadLimit}</span><span>{item.storageUsedMb} / {item.storageLimitMb ?? "-"} MB</span><span>{item.isDeleted ? "Deleted" : item.isActive ? "Active" : "Inactive"}</span></button>)}</div>; }
function DocumentTable({ documents = [], onDelete }) { return <div className="admin-table">{documents.map(item => <div key={item.id}><strong>{item.originalFilename}</strong><span>{item.ownerName || item.ownerEmail}</span><span>{date(item.uploadedAt)}</span><span>{item.sizeMb} MB</span><span>{item.status}</span><button className="danger-link" onClick={() => onDelete(item.id)}>Delete</button></div>)}</div>; }
