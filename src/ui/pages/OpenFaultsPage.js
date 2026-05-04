import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
export function OpenFaultsPage() {
    const { siteFileId } = useParams();
    const navigate = useNavigate();
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // TODO: replace with Firestore
        const mock = [
            {
                id: "1",
                reference: "F-001",
                description: "Detector contamination fault",
                location: "Office Corridor",
                assetRef: "L1-023",
                status: "open",
                reportedAt: "2026-03-28T10:00:00Z",
            },
            {
                id: "2",
                reference: "F-002",
                description: "Sounder not activating",
                location: "Warehouse",
                assetRef: "L2-011",
                status: "urgent",
                reportedAt: "2026-03-29T09:30:00Z",
            },
        ];
        setTimeout(() => {
            setFaults(mock);
            setLoading(false);
        }, 300);
    }, []);
    const formatDate = (date) => new Intl.DateTimeFormat("en-IE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(date));
    const statusStyle = (status) => {
        const base = {
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 800,
        };
        switch (status) {
            case "urgent":
                return { ...base, background: "#fee2e2", color: "#b91c1c" };
            case "in-progress":
                return { ...base, background: "#dbeafe", color: "#1d4ed8" };
            default:
                return { ...base, background: "#fef3c7", color: "#92400e" };
        }
    };
    const sorted = useMemo(() => {
        return [...faults].sort((a, b) => (b.reportedAt ?? "").localeCompare(a.reportedAt ?? ""));
    }, [faults]);
    const closeFault = (id) => {
        if (!window.confirm("Close this fault?"))
            return;
        setFaults((prev) => prev.filter((f) => f.id !== id));
    };
    return (_jsx(AppLayout, { title: "Open Faults", subtitle: "Active system issues", children: loading ? (_jsx("div", { style: emptyStyle, children: "Loading faults\u2026" })) : faults.length === 0 ? (_jsx("div", { style: emptyStyle, children: "No open faults \uD83C\uDF89" })) : (_jsx("div", { style: listStyle, children: sorted.map((f) => (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: topRow, children: [_jsx("div", { style: refStyle, children: f.reference }), _jsx("div", { style: statusStyle(f.status), children: f.status })] }), _jsx("div", { style: descStyle, children: f.description }), f.location && (_jsxs("div", { style: locationStyle, children: ["\uD83D\uDCCD ", f.location] })), f.assetRef && (_jsxs("div", { style: assetStyle, children: ["Asset: ", f.assetRef] })), _jsxs("div", { style: metaRow, children: ["Reported: ", formatDate(f.reportedAt)] }), _jsxs("div", { style: actionsRow, children: [_jsx("button", { style: primaryBtn, onClick: () => navigate(`/site/${siteFileId}/visit/new?fault=${f.id}`), children: "Action" }), _jsx("button", { style: secondaryBtn, onClick: () => closeFault(f.id), children: "Close" })] })] }, f.id))) })) }));
}
/* STYLES */
const listStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
};
const cardStyle = {
    background: "#fff",
    borderRadius: "16px",
    padding: "14px",
    border: "1px solid #e5e7eb",
};
const topRow = {
    display: "flex",
    justifyContent: "space-between",
};
const refStyle = {
    fontWeight: 800,
};
const descStyle = {
    marginTop: "6px",
    fontWeight: 600,
};
const locationStyle = {
    marginTop: "6px",
    color: "#6b7280",
};
const assetStyle = {
    marginTop: "4px",
    fontSize: "0.85rem",
    color: "#374151",
};
const metaRow = {
    marginTop: "8px",
    fontSize: "0.8rem",
    color: "#6b7280",
};
const actionsRow = {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
};
const primaryBtn = {
    flex: 1,
    background: "#111827",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
};
const secondaryBtn = {
    flex: 1,
    background: "#f3f4f6",
    border: "none",
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
};
const emptyStyle = {
    textAlign: "center",
    padding: "40px",
    color: "#6b7280",
};
