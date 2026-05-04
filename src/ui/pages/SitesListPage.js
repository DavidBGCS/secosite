import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/ui/pages/SitesListPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSiteFile } from "../../core";
import { useSites } from "../../app/state/useSites";
import { AppLayout } from "../layouts/AppLayout";
import { Card, CardTitle, Field, PrimaryButton, SecondaryButton, inputStyle, } from "../components/ui";
import { formatIrishDateTime } from "../utils/dateTime";
function getSiteSubtitle(siteFile) {
    const address = siteFile.site.address;
    if (typeof address === "string") {
        return address || siteFile.site.clientName || "No address";
    }
    const parts = [
        address?.line1,
        address?.city,
        address?.county,
        address?.country,
    ].filter(Boolean);
    if (parts.length > 0)
        return parts.join(", ");
    return siteFile.site.clientName || "No address";
}
export function SitesListPage() {
    const { sites, saveSite, deleteSite } = useSites();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [siteCode, setSiteCode] = useState("");
    const [messages, setMessages] = useState([]);
    const [saving, setSaving] = useState(false);
    const sortedSites = useMemo(() => {
        return [...sites].sort((a, b) => (b.metadata.updatedAt ?? "").localeCompare(a.metadata.updatedAt ?? ""));
    }, [sites]);
    const handleCreate = async () => {
        if (!name.trim()) {
            setMessages(["Site name is required."]);
            return;
        }
        try {
            setSaving(true);
            const now = new Date().toISOString();
            const site = {
                id: `site-${Date.now()}`,
                name: name.trim(),
                siteCode: siteCode.trim() || undefined,
                createdAt: now,
                updatedAt: now,
            };
            const siteFile = createSiteFile(site);
            await saveSite(siteFile);
            setName("");
            setSiteCode("");
            setMessages([`Site "${site.name}" created.`]);
            navigate(`/site/${siteFile.metadata.siteFileId}/overview`);
        }
        catch (error) {
            setMessages([
                error instanceof Error ? error.message : "Failed to create site.",
            ]);
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (siteFileId, siteName) => {
        const confirmed = window.confirm(`Delete site "${siteName}"? This cannot be undone.`);
        if (!confirmed)
            return;
        try {
            await deleteSite(siteFileId);
            setMessages([`Site "${siteName}" deleted.`]);
        }
        catch (error) {
            setMessages([
                error instanceof Error ? error.message : "Failed to delete site.",
            ]);
        }
    };
    return (_jsx(AppLayout, { title: "Sites", subtitle: "SeCo Site field records", children: _jsxs("div", { style: pageGridStyle, children: [_jsx(Card, { children: _jsxs("div", { style: heroWrapStyle, children: [_jsxs("div", { children: [_jsx("div", { style: eyebrowStyle, children: "SECOSITE" }), _jsx("div", { style: heroTitleStyle, children: "Site Records" }), _jsx("div", { style: heroSubStyle, children: "Create, open, and manage site files for visits, faults, assets, replacements, notes, and reports." })] }), _jsxs("div", { style: heroBadgeStyle, children: [sortedSites.length, " Sites"] })] }) }), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Create New Site" }), _jsxs("div", { style: { display: "grid", gap: "12px" }, children: [_jsx(Field, { label: "Site Name", children: _jsx("input", { placeholder: "Enter site name", value: name, onChange: (e) => setName(e.target.value), style: inputStyle }) }), _jsx(Field, { label: "Site Reference", children: _jsx("input", { placeholder: "Optional site reference", value: siteCode, onChange: (e) => setSiteCode(e.target.value), style: inputStyle }) }), _jsx(PrimaryButton, { onClick: handleCreate, disabled: saving, children: saving ? "Creating…" : "Create Site" })] })] }), messages.length > 0 && (_jsxs(Card, { children: [_jsx(CardTitle, { children: "Messages" }), _jsx("div", { style: messageListStyle, children: messages.map((message, index) => (_jsx("div", { children: message }, `${message}-${index}`))) })] })), _jsxs(Card, { children: [_jsx(CardTitle, { children: "Saved Sites" }), sortedSites.length === 0 ? (_jsx("p", { style: emptyTextStyle, children: "No sites created yet." })) : (_jsx("div", { style: siteGridStyle, children: sortedSites.map((siteFile) => (_jsxs("div", { style: siteCardStyle, children: [_jsxs("div", { style: siteCardTopStyle, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: siteNameStyle, children: siteFile.site.name }), _jsxs("div", { style: siteSubStyle, children: [siteFile.site.siteCode ?? "No reference", " \u2022", " ", getSiteSubtitle(siteFile)] })] }), _jsxs("div", { style: siteStatsPillStyle, children: [siteFile.visits.length, " visit", siteFile.visits.length === 1 ? "" : "s"] })] }), _jsxs("div", { style: siteMetaGridStyle, children: [_jsxs("div", { children: [_jsx("strong", { children: "Open faults:" }), " ", siteFile.openFaults.length] }), _jsxs("div", { children: [_jsx("strong", { children: "Assets:" }), " ", siteFile.assets.length] }), _jsxs("div", { children: [_jsx("strong", { children: "Updated:" }), " ", siteFile.metadata.updatedAt
                                                        ? formatIrishDateTime(siteFile.metadata.updatedAt)
                                                        : "—"] }), _jsxs("div", { children: [_jsx("strong", { children: "Created:" }), " ", siteFile.site.createdAt
                                                        ? formatIrishDateTime(siteFile.site.createdAt)
                                                        : "—"] })] }), _jsxs("div", { style: siteActionGridStyle, children: [_jsx(PrimaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/overview`), children: "Open" }), _jsx(SecondaryButton, { onClick: () => navigate(`/site/${siteFile.metadata.siteFileId}/edit`), children: "Edit" }), _jsx(SecondaryButton, { onClick: () => handleDelete(siteFile.metadata.siteFileId, siteFile.site.name), style: dangerButtonStyle, children: "Delete" })] })] }, siteFile.metadata.siteFileId))) }))] })] }) }));
}
const pageGridStyle = {
    display: "grid",
    gap: "14px",
};
const heroWrapStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "12px",
};
const eyebrowStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#6b7280",
    marginBottom: "6px",
};
const heroTitleStyle = {
    fontSize: "1.45rem",
    fontWeight: 800,
    lineHeight: 1.1,
    color: "#111827",
    marginBottom: "6px",
};
const heroSubStyle = {
    color: "#6b7280",
    fontSize: "0.95rem",
    lineHeight: 1.45,
    maxWidth: "700px",
};
const heroBadgeStyle = {
    borderRadius: "999px",
    padding: "8px 12px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "0.82rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const messageListStyle = {
    display: "grid",
    gap: "6px",
    color: "#92400e",
    fontWeight: 700,
};
const emptyTextStyle = {
    margin: 0,
    color: "#6b7280",
};
const siteGridStyle = {
    display: "grid",
    gap: "12px",
};
const siteCardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px",
    background: "#ffffff",
    display: "grid",
    gap: "12px",
};
const siteCardTopStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
};
const siteNameStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2,
};
const siteSubStyle = {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginTop: "4px",
    lineHeight: 1.35,
};
const siteStatsPillStyle = {
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "0.76rem",
    fontWeight: 800,
    whiteSpace: "nowrap",
};
const siteMetaGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 12px",
    color: "#374151",
    fontSize: "0.92rem",
};
const siteActionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
};
const dangerButtonStyle = {
    border: "1px solid #ef4444",
    color: "#b91c1c",
};
